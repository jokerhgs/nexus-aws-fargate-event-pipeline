#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { NexusStack } from '../lib/nexus-stack';
import { Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";

const app = new cdk.App();
new NexusStack(app, 'NexusStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
});

Aspects.of(app).add(new AwsSolutionsChecks());
