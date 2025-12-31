#include "../include/graph.hpp"
#include <queue>
#include <climits>
#include <bits/stdc++.h>

vector<int> dijkstra(Graph &g, int start, int end) {
    vector<int> dist(g.n, INT_MAX);
    vector<int> parent(g.n, -1);

    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq;

    dist[start] = 0;
    pq.push({0, start});

    while (!pq.empty()) {
        pair<int,int> top = pq.top(); pq.pop();
        int d = top.first;
        int u = top.second;

        for (auto edge : g.adj[u]) {
            int v = edge.to;
            int w = edge.weight;

            if (dist[v] > d + w) {
                dist[v] = d + w;
                parent[v] = u;
                pq.push({dist[v], v});
            }
        }
    }

    vector<int> path;
    for (int v = end; v != -1; v = parent[v])
        path.push_back(v);

    reverse(path.begin(), path.end());
    return path;
}
