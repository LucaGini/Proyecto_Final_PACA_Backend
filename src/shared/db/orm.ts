import { MikroORM, t } from "@mikro-orm/core";
import { MongoHighlighter } from "@mikro-orm/mongo-highlighter";


export const orm = await MikroORM.init({
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  dbName: 'Ecommerce2023',
  type: 'mongo',
  clientUrl: 'mongodb://127.0.0.1:27017',
  highlighter: new MongoHighlighter(),
  debug: true,
  allowGlobalContext: true,
  schemaGenerator: { //never in production
    disableForeignKeys: true,
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  }
})

export const syncSchema = async () => {
  const generator = orm.getSchemaGenerator();
  /*
  await generator.dropSchema();
  await generator.createSchema();
  */
  await generator.updateSchema();
}