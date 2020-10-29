const { promises: fs } = require('fs')
const path = require('path')
const globby = require('globby')
const { format: formatSql } = require('pg-formatter')

async function format({ sourcePaths, check = false }) {
  const reformattedSources = []

  for (const sourcePath of sourcePaths) {
    const contents = await fs.readFile(sourcePath, 'utf-8')
    const formatted = formatSql(contents)
    if (contents !== formatted) {
      if (check) {
        if (reformattedSources.length === 0) {
          console.error('WOULD reformat:')
        }
        console.error(`- ${sourcePath}`)
      } else {
        await fs.writeFile(sourcePath, formatted)
        console.error(`Reformatted ${sourcePath}`)
      }
      reformattedSources.push(sourcePath)
    }
  }

  return reformattedSources
}

async function main(args) {
  const check = args.includes('--check')
  const srcPath = path.join(__dirname, '..', 'src')
  const sourcePaths = await globby([
    `${srcPath}/*.sql`,
    // Omit seed data, since pg-formatter does not fully support arrays in the
    // `FROM STDIN` syntax.
    `!${srcPath}/seed_data.sql`,
  ])
  const reformattedSources = await format({ sourcePaths, check })
  if (check) {
    if (reformattedSources.length) {
      process.exit(1)
    } else {
      console.error('All sources match format')
    }
  }
}

;(async () => {
  try {
    await main(process.argv)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
