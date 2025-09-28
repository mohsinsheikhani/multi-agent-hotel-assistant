import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { CognitoAuth } from "../auth/cognito";
import { KnowledgeBaseInfrastructure } from "../ai/knowledge-base";

export interface StackOutputsProps {
  cognitoAuth: CognitoAuth;
  agentcoreGatewayRole: iam.Role;
  searchHotelLambda: lambda.Function;
  roomReservationLambda: lambda.Function;
  queryReservationsLambda: lambda.Function;
  guestAdvisoryKbLambda: lambda.Function;
  modifyReservationLambda: lambda.Function;
  knowledgeBase?: KnowledgeBaseInfrastructure;
  knowledgeBaseRef?: string;
}

export class StackOutputs extends Construct {
  constructor(scope: Construct, id: string, props: StackOutputsProps) {
    super(scope, id);

    const {
      cognitoAuth,
      agentcoreGatewayRole,
      searchHotelLambda,
      roomReservationLambda,
      queryReservationsLambda,
      guestAdvisoryKbLambda,
      modifyReservationLambda,
      knowledgeBase,
      knowledgeBaseRef,
    } = props;

    new cdk.CfnOutput(this, "CognitoDomainUrl", {
      value: cognitoAuth.userPoolDomain.baseUrl(),
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: cognitoAuth.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: cognitoAuth.m2mClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, "UserPoolClientSecret", {
      value: cognitoAuth.m2mClient.userPoolClientSecret.unsafeUnwrap(),
    });

    new cdk.CfnOutput(this, "CognitoDiscoveryUrl", {
      value: `${cognitoAuth.userPool.userPoolProviderUrl}/.well-known/openid-configuration`,
    });

    new cdk.CfnOutput(this, "AgentCoreHotelGatewayRoleArn", {
      value: agentcoreGatewayRole.roleArn,
    });

    new cdk.CfnOutput(this, "SearchHotelLambdaArn", {
      value: searchHotelLambda.functionArn,
    });

    new cdk.CfnOutput(this, "RoomReservationLambdaArn", {
      value: roomReservationLambda.functionArn,
    });

    new cdk.CfnOutput(this, "QueryReservationsLambdaArn", {
      value: queryReservationsLambda.functionArn,
    });

    new cdk.CfnOutput(this, "GuestAdvisoryKbLambdaArn", {
      value: guestAdvisoryKbLambda.functionArn,
    });

    new cdk.CfnOutput(this, "ModifyReservationLambdaArn", {
      value: modifyReservationLambda.functionArn,
    });

    if (knowledgeBase) {
      new cdk.CfnOutput(this, "CollectionArn", {
        value: knowledgeBase.collection.attrArn,
        exportName: "OpenSearchCollectionArn",
      });

      new cdk.CfnOutput(this, "BucketArn", {
        value: knowledgeBase.s3Bucket.attrArn,
        exportName: "OpenSearchBucketArn",
      });

      new cdk.CfnOutput(this, "BedrockRoleArn", {
        value: knowledgeBase.bedrockRole.attrArn,
        exportName: "BedrockRoleArn",
      });

      new cdk.CfnOutput(this, "BucketName", {
        value: knowledgeBase.s3Bucket.ref,
        exportName: "BucketName",
      });
    }

    if (knowledgeBaseRef) {
      new cdk.CfnOutput(this, "KnowledgeBaseId", {
        value: knowledgeBaseRef,
      });
    }
  }
}
