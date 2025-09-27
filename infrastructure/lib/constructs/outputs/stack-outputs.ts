import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface StackOutputsProps {
  searchHotelLambda: lambda.Function;
  roomReservationLambda: lambda.Function;
  queryReservationsLambda: lambda.Function;
  guestAdvisoryKbLambda: lambda.Function;
  modifyReservationLambda: lambda.Function;
}

export class StackOutputs extends Construct {
  constructor(scope: Construct, id: string, props: StackOutputsProps) {
    super(scope, id);

    const {
      searchHotelLambda,
      roomReservationLambda,
      queryReservationsLambda,
      guestAdvisoryKbLambda,
      modifyReservationLambda,
    } = props;

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
  }
}
