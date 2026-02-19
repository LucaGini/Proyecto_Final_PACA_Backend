import { MikroORM } from "@mikro-orm/core";
import { MongoHighlighter } from "@mikro-orm/mongo-highlighter";
import { BaseEntity } from "./baseEntity.entity.js";
import { Category } from "../../category/category.entity.js";
import { City } from "../../city/city.entity.js";
import { CronConfig } from "../../cron/cron.entity.js";
import { Order } from "../../order/order.entity.js";
import { Product } from "../../product/product.entity.js";
import { Province } from "../../province/province.entity.js";
import { Supplier } from "../../supplier/supplier.entity.js";
import { User } from "../../user/user.entity.js";
import { Vrp } from "../../vrp/vrp.entity.js";
import dotenv from "dotenv";

dotenv.config();

export const orm = await MikroORM.init({
  entities: [BaseEntity, Category, City, CronConfig, Order, Product, Province, Supplier, User, Vrp],
  dbName: 'ProyectoFinalPACA',
  type: 'mongo',
  clientUrl: process.env.MONGODB_URL,
  highlighter: new MongoHighlighter(),
  debug: process.env.NODE_ENV !== 'production',
  allowGlobalContext: true,
  schemaGenerator: {
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