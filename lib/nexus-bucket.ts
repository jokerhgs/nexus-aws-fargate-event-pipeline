import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";

export class NexusBucket extends Construct {
    public readonly bucket: s3.IBucket;
    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.bucket = new s3.Bucket(this, 'NexusBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
    }
}