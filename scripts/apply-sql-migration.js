const fs = require('fs')
const { Client } = require('pg')

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, ''),
      ]
    }),
)

const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL)
const projectRef = url.hostname.split('.')[0]
const region = env.SUPABASE_DB_REGION || 'ap-northeast-2'
const pooler = env.SUPABASE_DB_POOLER || 'aws-0'
const password = env.SUPABASE_DB_PASSWORD

const sqlPath =
  process.argv[2] || 'supabase/migrations/021_rbac_roles_and_accounts.sql'
const sql = fs.readFileSync(sqlPath, 'utf8')

async function main() {
  const host = `${pooler}-${region}.pooler.supabase.com`
  const client = new Client({
    host,
    port: 6543,
    database: 'postgres',
    user: `postgres.${projectRef}`,
    password,
    ssl: { rejectUnauthorized: false },
  })
  console.log('Connecting', host, 'as', `postgres.${projectRef}`)
  await client.connect()
  try {
    await client.query(sql)
    console.log('Migration applied:', sqlPath)
    const { rows } = await client.query(
      `select slug, account_id is null as is_template, count(*) over() 
       from roles order by account_id nulls first, slug limit 20`,
    )
    console.log('roles sample', rows)
    const { rows: profiles } = await client.query(
      `select role, account_id = user_id as is_owner, role_id is not null as has_role
       from profiles`,
    )
    console.log('profiles', profiles)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
