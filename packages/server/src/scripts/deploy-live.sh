#!/usr/bin/env bash
set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-expense-tracker}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "Fetching secrets from SSM (profile=$AWS_PROFILE region=$AWS_REGION)..."

MONGO_URI="$(aws ssm get-parameter --name /expense-tracker/mongo-uri --with-decryption --query Parameter.Value --output text --profile "$AWS_PROFILE" --region "$AWS_REGION")"
JWT_SECRET="$(aws ssm get-parameter --name /expense-tracker/jwt-secret --with-decryption --query Parameter.Value --output text --profile "$AWS_PROFILE" --region "$AWS_REGION")"

# quick check
if [[ -z "$MONGO_URI" || -z "$JWT_SECRET" ]]; then
  echo "Failed to read secrets from SSM. Exiting." >&2
  exit 1
fi

echo "Deploying server..."
MONGO_URI="$MONGO_URI" JWT_SECRET="$JWT_SECRET" pnpm --filter server exec serverless deploy --force
