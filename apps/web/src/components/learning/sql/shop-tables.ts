// Kept apart from shop-db.ts: lesson pages show this list, while the SQL text
// of the teaching database is needed only inside the SQL worker.
/** Tables and columns as learners see them in the "Таблицы базы" panel. */
export const SHOP_TABLES: { name: string; title: string; columns: string[] }[] =
  [
    { name: "categories", title: "категории товаров", columns: ["id", "name"] },
    {
      name: "products",
      title: "товары",
      columns: [
        "id",
        "name",
        "category_id",
        "price",
        "weight_g",
        "is_available",
        "added_on"
      ]
    },
    {
      name: "customers",
      title: "покупатели",
      columns: [
        "id",
        "name",
        "email",
        "city",
        "phone",
        "birthday",
        "registered_on"
      ]
    },
    {
      name: "staff",
      title: "сотрудники",
      columns: ["id", "name", "role", "salary", "hired_on", "manager_id"]
    },
    {
      name: "orders",
      title: "заказы",
      columns: ["id", "customer_id", "staff_id", "created_at", "status"]
    },
    {
      name: "order_items",
      title: "позиции заказов",
      columns: ["order_id", "product_id", "quantity", "unit_price"]
    },
    {
      name: "reviews",
      title: "отзывы",
      columns: [
        "id",
        "customer_id",
        "product_id",
        "rating",
        "comment",
        "created_on"
      ]
    }
  ];
