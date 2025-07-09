import { MikroORM, t } from "@mikro-orm/core";
import { MongoHighlighter } from "@mikro-orm/mongo-highlighter";


export const orm = await MikroORM.init({
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  dbName: 'ProyectoFinalPACA',
  type: 'mongo',
  clientUrl: 'mongodb+srv://tomasfrattin:i4xujh43chsIhjeo@proyectofinalpaca.rgmjijc.mongodb.net/?retryWrites=true&w=majority&appName=ProyectoFinalPACA',
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