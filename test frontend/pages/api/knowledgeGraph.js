// pages/api/graph.js
import neo4j from "neo4j-driver";

// Load environment variables
const NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "password";

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

export default async function handler(req, res) {
  const session = driver.session();
  try {
    const result = await session.run(
      "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50"
    );

    const nodes = [];
    const links = [];

    result.records.forEach(record => {
      const n = record.get("n");
      const m = record.get("m");
      const r = record.get("r");

      nodes.push({ id: n.identity.toString(), ...n.properties });
      nodes.push({ id: m.identity.toString(), ...m.properties });

      links.push({
        source: n.identity.toString(),
        target: m.identity.toString(),
        type: r.type
      });
    });

    // Remove duplicate nodes (Neo4j returns each node per relationship)
    const uniqueNodes = Array.from(
      new Map(nodes.map(n => [n.id, n])).values()
    );

    res.status(200).json({ nodes: uniqueNodes, links });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Something went wrong" });
  } finally {
    await session.close();
  }
}
