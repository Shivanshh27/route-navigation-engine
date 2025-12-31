#include "../include/graph.hpp"
#include <queue>
#include <cmath>
#include <climits>
#include <bits/stdc++.h>
double heuristic(Graph &g, int u, int v) {
    double dx = g.nodes[u].x - g.nodes[v].x;
    double dy = g.nodes[u].y - g.nodes[v].y;
    return sqrt(dx * dx + dy * dy);
}

vector<int> astar(Graph &g, int start, int end) {
    vector<double> gScore(g.n, 1e18);
    vector<int> parent(g.n, -1);
    vector<bool> visited(g.n, false);

    // ✅ IMPORTANT
    gScore[start] = 0;

    priority_queue<
        pair<double, int>,
        vector<pair<double, int>>,
        greater<pair<double, int>>
    > pq;

    // f = g + h
    pq.push({heuristic(g, start, end), start});

    while (!pq.empty()) {
        auto top = pq.top(); pq.pop();
        int u = top.second;

        if (visited[u]) continue;
        visited[u] = true;

        if (u == end) break;

        for (auto edge : g.adj[u]) {
            int v = edge.to;
            int w = edge.weight;

            if (gScore[v] > gScore[u] + w) {
                gScore[v] = gScore[u] + w;
                parent[v] = u;

                double f = gScore[v] + heuristic(g, v, end);
                pq.push({f, v});
            }
        }
    }

    // 🔁 Path reconstruction
    vector<int> path;
    for (int v = end; v != -1; v = parent[v])
        path.push_back(v);

    reverse(path.begin(), path.end());
    return path;
}
