import { Construct } from "constructs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as cdk from "aws-cdk-lib/core";


export class NexusQueue extends Construct {
    public readonly queue: sqs.Queue;
    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.queue = new sqs.Queue(this, 'NexusQueue', {
            queueName: 'nexus-queue',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
    }
}