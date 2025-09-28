import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as opensearchserverless from "aws-cdk-lib/aws-opensearchserverless";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import { Construct } from "constructs";
import { CONFIG } from "../../config";

export class KnowledgeBaseInfrastructure extends Construct {
  public readonly collection: opensearchserverless.CfnCollection;
  public readonly s3Bucket: s3.CfnBucket;
  public readonly bedrockRole: iam.CfnRole;
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const encryptionPolicy = new opensearchserverless.CfnSecurityPolicy(
      this,
      "EncryptionPolicy",
      {
        name: `${CONFIG.collectionName}-security-policy`,
        type: "encryption",
        description: "Encryption policy for OpenSearch Serverless collection",
        policy: JSON.stringify({
          Rules: [
            {
              ResourceType: "collection",
              Resource: [`collection/${CONFIG.collectionName}`],
            },
          ],
          AWSOwnedKey: true,
        }),
      }
    );

    const networkPolicy = new opensearchserverless.CfnSecurityPolicy(
      this,
      "NetworkPolicy",
      {
        name: `${CONFIG.collectionName}-network-policy`,
        type: "network",
        description: "Network policy for OpenSearch Serverless collection",
        policy: JSON.stringify([
          {
            Rules: [
              {
                ResourceType: "collection",
                Resource: [`collection/${CONFIG.collectionName}`],
              },
              {
                ResourceType: "dashboard",
                Resource: [`collection/${CONFIG.collectionName}`],
              },
            ],
            AllowFromPublic: true,
          },
        ]),
      }
    );

    this.bedrockRole = new iam.CfnRole(this, "BedrockRole", {
      roleName: `AmazonBedrockExecutionRoleForKB-${CONFIG.collectionName}`,
      assumeRolePolicyDocument: {
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "bedrock.amazonaws.com",
            },
            Action: "sts:AssumeRole",
            Condition: {
              StringEquals: {
                "aws:SourceAccount": this.node.tryGetContext("account") || cdk.Stack.of(this).account,
              },
              ArnLike: {
                "aws:SourceArn": `arn:aws:bedrock:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:knowledge-base/*`,
              },
            },
          },
        ],
      },
      policies: [
        {
          policyName: "OpensearchServerlessAccessPolicy",
          policyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: ["aoss:APIAccessAll", "aoss:DashboardsAccessAll"],
                Resource: `arn:aws:aoss:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:collection/*`,
              },
            ],
          },
        },
        {
          policyName: "BedrockAccessPolicy",
          policyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: ["bedrock:ListCustomModels", "bedrock:InvokeModel"],
                Resource: `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/*`,
              },
            ],
          },
        },
        {
          policyName: "S3AccessForKnowledgeBase",
          policyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: [
                  "s3:GetObject",
                  "s3:ListBucket",
                  "s3:GetBucketLocation",
                ],
                Resource: [
                  `arn:aws:s3:::${CONFIG.collectionName}-${cdk.Stack.of(this).account}`,
                  `arn:aws:s3:::${CONFIG.collectionName}-${cdk.Stack.of(this).account}/*`,
                ],
              },
            ],
          },
        },
      ],
    });

    const dataAccessPolicy = new opensearchserverless.CfnAccessPolicy(
      this,
      "DataAccessPolicy",
      {
        name: `${CONFIG.collectionName}-access-policy`,
        type: "data",
        description: "Data access policy for OpenSearch Serverless collection",
        policy: JSON.stringify([
          {
            Description: "Provided Access for Bedrock and IAM user",
            Rules: [
              {
                ResourceType: "index",
                Resource: ["index/*/*"],
                Permission: [
                  "aoss:ReadDocument",
                  "aoss:WriteDocument",
                  "aoss:CreateIndex",
                  "aoss:DeleteIndex",
                  "aoss:UpdateIndex",
                  "aoss:DescribeIndex",
                ],
              },
              {
                ResourceType: "collection",
                Resource: [`collection/${CONFIG.collectionName}`],
                Permission: [
                  "aoss:CreateCollectionItems",
                  "aoss:DeleteCollectionItems",
                  "aoss:UpdateCollectionItems",
                  "aoss:DescribeCollectionItems",
                ],
              },
            ],
            Principal: [
              CONFIG.iamUserArn,
              this.bedrockRole.attrArn,
              `arn:aws:iam::${cdk.Stack.of(this).account}:role/aws-service-role/bedrock.amazonaws.com/AWSServiceRoleForAmazonBedrock`,
            ],
          },
        ]),
      }
    );

    this.s3Bucket = new s3.CfnBucket(this, "S3Bucket", {
      bucketName: `${CONFIG.collectionName}-${cdk.Stack.of(this).account}`,
      accessControl: "Private",
      publicAccessBlockConfiguration: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      versioningConfiguration: { status: "Enabled" },
    });

    this.s3Bucket.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;

    this.collection = new opensearchserverless.CfnCollection(
      this,
      "Collection",
      {
        name: CONFIG.collectionName,
        type: "VECTORSEARCH",
        description: "Collection for vector search data",
      }
    );

    this.collection.addDependency(encryptionPolicy);
    this.collection.addDependency(networkPolicy);

    this.knowledgeBase = new bedrock.CfnKnowledgeBase(this, "KnowledgeBase", {
      name: CONFIG.collectionName,
      description: "Answers on basis of data in knowledge base",
      roleArn: this.bedrockRole.attrArn,
      knowledgeBaseConfiguration: {
        type: "VECTOR",
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${cdk.Stack.of(this).region}::foundation-model/amazon.titan-embed-text-v2:0`,
        },
      },
      storageConfiguration: {
        type: "OPENSEARCH_SERVERLESS",
        opensearchServerlessConfiguration: {
          collectionArn: this.collection.attrArn,
          vectorIndexName: CONFIG.indexName,
          fieldMapping: {
            vectorField: "vector",
            textField: "text",
            metadataField: "metadata",
          },
        },
      },
    });

    const dataSource = new bedrock.CfnDataSource(this, "DataSource", {
      knowledgeBaseId: this.knowledgeBase.ref,
      name: CONFIG.collectionName,
      dataSourceConfiguration: {
        type: "S3",
        s3Configuration: {
          bucketArn: this.s3Bucket.attrArn,
        },
      },
    });
  }
}
