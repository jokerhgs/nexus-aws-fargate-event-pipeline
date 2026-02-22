import { Construct } from "constructs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as cdk from "aws-cdk-lib/core";
import * as ec2 from "aws-cdk-lib/aws-ec2";

interface NexusDatabaseProps {
    readonly vpc: ec2.IVpc;
}

export class NexusDatabase extends Construct {
    public readonly instance: rds.DatabaseInstance;

    constructor(scope: Construct, id: string, props: NexusDatabaseProps) {
        super(scope, id);

        this.instance = new rds.DatabaseInstance(this, 'NexusDatabase', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.of('17.6', '17'),
            }),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            vpc: props.vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
        });
    }
}


