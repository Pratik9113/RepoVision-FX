// Database detection

import path from "path";

const detectDatabases = (files, allAnalysis) => {
  const databases = [];
  const dbPatterns = {
    "PostgreSQL": ["pg", "postgres", "postgresql", "psycopg2", "asyncpg"],
    "MySQL": ["mysql", "mysql2", "pymysql", "aiomysql"],
    "MongoDB": ["mongodb", "pymongo", "mongoose", "motor"],
    "SQLite": ["sqlite", "sqlite3", "aiosqlite"],
    "Redis": ["redis", "ioredis", "aioredis"],
    "DynamoDB": ["dynamodb", "aws-sdk", "boto3"],
    "Firebase": ["firebase", "firestore", "firebase-admin"],
    "Supabase": ["supabase", "@supabase/supabase-js"],
    "Prisma": ["prisma", "@prisma/client"],
    "Sequelize": ["sequelize", "sequelize-cli"],
    "TypeORM": ["typeorm", "typeorm-cli"],
    "SQLAlchemy": ["sqlalchemy", "alembic"],
    "Django ORM": ["django.db", "django.contrib.auth"],
    "Mongoose": ["mongoose"],
    "Knex": ["knex"],
    "Objection": ["objection"],
    "MikroORM": ["mikro-orm"],
    "Doctrine": ["doctrine"],
    "Entity Framework": ["entity-framework", "ef-core"],
    "Hibernate": ["hibernate", "jpa"]
  };

  for (const file of files) {
    if (!file.content) continue;

    const filename = path.basename(file.path);
    const ext = path.extname(file.path).toLowerCase();

    // Skip noisy files that give false positives or weak evidence
    if (['.md', '.markdown', '.lock', '.css', '.scss', '.less', '.html', '.svg', '.png', '.jpg', '.jpeg', '.txt', '.xml', '.map'].includes(ext)) {
      continue;
    }

    // Skip package.json and lock files as requested (preferring code evidence)
    if (filename === 'package.json' || filename === 'package-lock.json' || filename === 'yarn.lock' || filename === 'pnpm-lock.yaml' || filename === 'composer.json' || filename === 'composer.lock') {
      continue;
    }

    const content = file.content;
    for (const [dbType, patterns] of Object.entries(dbPatterns)) {
      for (const pattern of patterns) {
        if (content.includes(pattern)) {
          databases.push({
            type: dbType,
            orm: pattern,
            evidence: `Found in ${file.path}`,
            file: file.path
          });
          break;
        }
      }
    }
  }

  return databases;
};

export { detectDatabases };