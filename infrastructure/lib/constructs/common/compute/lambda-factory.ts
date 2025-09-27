import * as path from "path";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Duration } from "aws-cdk-lib";

interface CustomLambdaProps extends Partial<NodejsFunctionProps> {
  id: string;
  entryFile: string;
  duration?: number;
  memorySize?: number;
  environment?: Record<string, string>;
  vpc?: ec2.IVpc;
  vpcSubnets?: ec2.SubnetSelection;
}

export const createLambda = (
  scope: Construct,
  {
    id,
    entryFile,
    environment = {},
    memorySize = 128,
    duration = 10,
    vpc,
    vpcSubnets,
    ...overrides
  }: CustomLambdaProps
): NodejsFunction => {
  return new NodejsFunction(scope, id, {
    functionName: id,
    runtime: lambda.Runtime.NODEJS_22_X,
    handler: "handler",
    memorySize,
    timeout: Duration.seconds(duration),
    entry: path.join(process.cwd(), entryFile),
    environment,
    vpc,
    vpcSubnets,
    ...overrides,
  });
};
