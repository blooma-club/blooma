#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return

  const contents = fs.readFileSync(envPath, 'utf8')
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) continue
    const key = line.slice(0, eqIndex).trim()
    if (!key || process.env[key]) continue
    const value = line.slice(eqIndex + 1).trim()
    process.env[key] = value
  }
}

async function main() {
  loadDotEnv()

  const bucket = process.env.R2_BUCKET_NAME
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    console.error('Missing R2 configuration. Please set R2_BUCKET_NAME, R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.')
    process.exit(1)
  }

  const client = new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  const key = `test/video-upload/${Date.now()}.mp4`
  const body = Buffer.from('blooma r2 upload smoke test')

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'video/mp4',
      })
    )

    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    console.log('R2 upload succeeded:', { key, size: head.ContentLength })
  } finally {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      console.log('Cleaned up test object:', key)
    } catch (cleanupError) {
      console.warn('Failed to delete test object from R2:', cleanupError)
    }
  }
}

main().catch(error => {
  console.error('R2 upload smoke test failed:', error)
  process.exit(1)
})
