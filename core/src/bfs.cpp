#include "../include/graph.hpp"
#include <queue>
#include <vector>
#include <algorithm>

using namespace std;

vector<int> bfs(Graph &g, int start, int end) {
    vector<bool> visited(g.n, false);
    vector<int> parent(g.n, -1);
    queue<int> q;

    visited[start] = true;
    q.push(start);

    bool found = false;
    while (!q.empty()) {
        int u = q.front();
        q.pop();

        if (u == end) {
            found = true;
            break;
        }

        for (auto edge : g.adj[u]) {
            int v = edge.to;
            if (!visited[v]) {
                visited[v] = true;
                parent[v] = u;
                q.push(v);
            }
        }
    }

    vector<int> path;
    if (found || start == end) {
        for (int v = end; v != -1; v = parent[v]) {
            path.push_back(v);
        }
        reverse(path.begin(), path.end());
    }
    return path;
}
