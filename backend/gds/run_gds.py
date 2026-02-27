import os
from neo4j import GraphDatabase
from loguru import logger

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j")
DB = os.getenv("NEO4J_DB", "neo4j")

GRAPH_NAME = "taxpayerGraph"


def run():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session(database=DB) as session:
        logger.info("Dropping existing projection if exists")
        session.run("CALL gds.graph.drop($name, false)", name=GRAPH_NAME)

        logger.info("Projecting taxpayer graph with SELL_TO")
        session.run(
            """
            CALL gds.graph.project(
                $name,
                'Taxpayer',
                {
                    SELL_TO: {type: 'SELLS_TO', orientation: 'NATURAL'}
                },
                {
                    nodeProperties: ['risk_score', 'compliance_score']
                }
            )
            """,
            name=GRAPH_NAME,
        )

        logger.info("Running PageRank")
        result = session.run(
            """
            CALL gds.pageRank.stream($name)
            YIELD nodeId, score
            RETURN gds.util.asNode(nodeId).gstin AS gstin, score
            """
            ,
            name=GRAPH_NAME,
        )
        for record in result:
            session.run(
                "MATCH (t:Taxpayer {gstin: $gstin}) SET t.pagerank_score = $score",
                gstin=record["gstin"],
                score=record["score"],
            )

        logger.info("Running Degree Centrality")
        result = session.run(
            """
            CALL gds.degree.stream($name)
            YIELD nodeId, score
            RETURN gds.util.asNode(nodeId).gstin AS gstin, score
            """,
            name=GRAPH_NAME,
        )
        for record in result:
            session.run(
                "MATCH (t:Taxpayer {gstin: $gstin}) SET t.degree_centrality = $score",
                gstin=record["gstin"],
                score=record["score"],
            )

        logger.info("Running Louvain clustering")
        result = session.run(
            """
            CALL gds.louvain.stream($name)
            YIELD nodeId, communityId
            RETURN gds.util.asNode(nodeId).gstin AS gstin, communityId
            """,
            name=GRAPH_NAME,
        )
        for record in result:
            session.run(
                "MATCH (t:Taxpayer {gstin: $gstin}) SET t.cluster_id = $cluster",
                gstin=record["gstin"],
                cluster=int(record["communityId"]),
            )

        logger.info("Running Weakly Connected Components")
        result = session.run(
            """
            CALL gds.wcc.stream($name)
            YIELD nodeId, componentId
            RETURN gds.util.asNode(nodeId).gstin AS gstin, componentId
            """,
            name=GRAPH_NAME,
        )
        for record in result:
            session.run(
                "MATCH (t:Taxpayer {gstin: $gstin}) SET t.component_id = $component",
                gstin=record["gstin"],
                component=int(record["componentId"]),
            )

        logger.info("GDS computations completed")


if __name__ == "__main__":
    run()
