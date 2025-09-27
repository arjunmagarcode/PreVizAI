// frontend/pages/index.js
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Load react-force-graph dynamically to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph").then(mod => mod.ForceGraph2D), { ssr: false });

export default function Home() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await fetch("/api/knowledgeGraph"); // Adjust to /api/knowledgeGraph if needed
        const data = await res.json();

        // Optional: remove duplicate nodes by id
        const uniqueNodes = [];
        const seenIds = new Set();
        data.nodes.forEach(node => {
          if (!seenIds.has(node.id)) {
            seenIds.add(node.id);
            uniqueNodes.push(node);
          }
        });

        setGraphData({ nodes: uniqueNodes, links: data.links });
      } catch (err) {
        console.error("Failed to fetch graph:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, []);

  if (loading) return <div>Loading knowledge graph...</div>;

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ForceGraph2D
        graphData={graphData}
        nodeAutoColorBy="type"
        nodeLabel={node => `${node.name} (${node.type})`}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = node.color || "#cccccc";
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size || 5, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.fillStyle = "#000000";
          ctx.fillText(label, node.x + (node.size || 5) + 2, node.y + fontSize / 2);
        }}
        linkLabel={link => link.type}
      />
    </div>
  );
}
