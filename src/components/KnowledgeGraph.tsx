"use client";
import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
interface Node {
  name: string;
  type: string;
  notes?: string;
  llm_summary?: string;
}
interface Edge {
  from_node: string;
  to_node: string;
  type: string;
}
interface KnowledgeGraphProps {
  nodes: Node[];
  edges: Edge[];
}
cytoscape.use(coseBilkent);
const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ nodes, edges }) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  useEffect(() => {
    if (!isClient || !cyRef.current) return;
    const validNodeIds = new Set(nodes.map((n) => n.name));
    const filteredEdges = edges.filter(
      (e) => validNodeIds.has(e.from_node) && validNodeIds.has(e.to_node)
    );
    const cy = cytoscape({
      container: cyRef.current,
      elements: [
        ...nodes.map((n) => ({
          data: {
            id: n.name,
            label: n.name,
            type: n.type,
            notes: n.notes,
            summary: n.llm_summary,
          },
        })),
        ...filteredEdges.map((e) => ({
          data: { source: e.from_node, target: e.to_node, label: e.type },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-wrap": "wrap",
            "text-max-width": "50px",
            "font-size": "7px",
            color: "#fff",
            "text-valign": "center",
            "text-halign": "center",
            shape: "ellipse",
            width: "50px",
            height: "35px",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#ccc",
            "target-arrow-color": "#ccc",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
      ],
      layout: {
        name: "cose-bilkent",
        animate: true,
        animationDuration: 500,
        nodeRepulsion: 3500,
        idealEdgeLength: 60,
        gravity: 0.3,
        edgeElasticity: 0.8,
        numIter: 2000,
        randomize: true,
        fit: true,
      } as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });
    const typeColors: Record<string, string> = {
      symptom: "#FF6B6B",
      treatment: "#4ECDC4",
      condition: "#FFD93D",
      trigger: "#9B59B6",
      default: "#007BFF",
    };
    // Add simple HTML tooltips
    cy.nodes().forEach((node: any) => {
      const type = (node.data("type") || "default").toLowerCase();
      node.style("background-color", typeColors[type] || typeColors.default);
      const tooltipDiv = document.createElement("div");
      tooltipDiv.style.padding = "6px";
      tooltipDiv.style.background = "rgba(0,0,0,0.85)";
      tooltipDiv.style.color = "#fff";
      tooltipDiv.style.borderRadius = "4px";
      tooltipDiv.style.fontSize = "11px";
      tooltipDiv.style.maxWidth = "250px";
      tooltipDiv.style.position = "absolute";
      tooltipDiv.style.pointerEvents = "none";
      tooltipDiv.style.display = "none";
      tooltipDiv.innerHTML = `<strong>${node.data("label")}</strong><br/>
                              Type: ${node.data("type") || "N/A"}<br/>
                              Notes: ${node.data("notes") || "N/A"}<br/>
                              Summary: ${node.data("summary") || "N/A"}`;
      document.body.appendChild(tooltipDiv);
      node.on("mouseover", () => {
        tooltipDiv.style.display = "block";
      });
      node.on("mouseout", () => {
        tooltipDiv.style.display = "none";
      });
      node.on("mousemove", (event: any) => {
        const offsetX = -250; // horizontal offset from node
        const offsetY = -250; // vertical offset from node
        const containerRect = cyRef.current!.getBoundingClientRect();
        tooltipDiv.style.left = containerRect.left + event.renderedPosition.x + offsetX + "px";
        tooltipDiv.style.top = containerRect.top + event.renderedPosition.y + offsetY + "px";
        tooltipDiv.style.position = "absolute";
        tooltipDiv.style.zIndex = "999"; // ensures it appears above other elements
      });
    });
    // Edge coloring
    cy.edges().forEach((edge: any) => {
      const type = (edge.data("label") || "").toLowerCase();
      if (type === "causes") {
        edge.style({ "line-color": "#FF5733", "target-arrow-color": "#FF5733", "line-style": "dashed" });
      } else if (type === "related_to") {
        edge.style({ "line-color": "#555", "target-arrow-color": "#555", "line-style": "solid" });
      } else if (type === "has_symptom") {
        edge.style({ "line-color": "#FF6B6B", "target-arrow-color": "#FF6B6B", "line-style": "solid" });
      } else if (type === "treated_by") {
        edge.style({ "line-color": "#4ECDC4", "target-arrow-color": "#4ECDC4", "line-style": "solid" });
      }
    });
    cy.fit();
    return () => {
      if (cyRef.current) cyRef.current.innerHTML = "";
    };
  }, [nodes, edges, isClient]);
  return <div ref={cyRef} className="w-full h-full border rounded-lg" />; //"w-full h-80 border rounded-lg" style={{ minHeight: "320px" }}
};
export default KnowledgeGraph;