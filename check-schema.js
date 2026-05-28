const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env.local" });

async function checkSchema() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("\n=== EVIDENCIA TABLE ===");
    const [evid] = await pool.query("DESCRIBE Evidencia");
    console.table(evid);

    console.log("\n=== ASIGNACIONDELEGADO TABLE ===");
    const [asg] = await pool.query("DESCRIBE AsignacionDelegado");
    console.table(asg);

    console.log("\n=== DEFENSA TABLE ===");
    const [def] = await pool.query("DESCRIBE Defensa");
    console.table(def);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
