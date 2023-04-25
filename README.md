#启动数据拉取scan数据服务 正式环境
pm2 start api_pm2.json --only aascan-engine --env prod

#启动数据拉取scan数据服务 开发环境
pm2 start api_pm2.json --only aascan-engine --env dev

