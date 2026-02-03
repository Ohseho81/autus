# Deploy

## Variables
TARGET: $ARGUMENTS

## Instructions
Execute deployment:

- vercel / frontend: `vercel --prod`
- railway / api: `railway up`
- all / full:
  1. Run all tests first
  2. Deploy API → Railway
  3. Deploy Frontend → Vercel
  4. 몰트봇 notification (if webhook set)

Post-deploy:
- [ ] Health check
- [ ] Chrome verification needed? → Note
- [ ] 몰트봇 → curl $MOLTBOT_WEBHOOK if set
