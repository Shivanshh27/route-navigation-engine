#include "../include/graph.hpp"
#include <vector>
#include <algorithm>

using namespace std;

bool dfsHelper(Graph &g, int u, int end, vector<bool> &visited, vector<int> &path) {
    visited[u] = true;
    path.push_back(u);

    if (u == end) {
        return true;
    }

    for (auto edge : g.adj[u]) {
        int v = edge.to;
        if (!visited[v]) {
            if (dfsHelper(g, v, end, visited, path)) {
                return true;
            }
        }
    }

    path.pop_back(); // Backtrack
    return false;
}

vector<int> dfs(Graph &g, int start, int end) {
    vector<bool> visited(g.n, false);
    vector<int> path;
    dfsHelper(g, start, end, visited, path);
    return path;
}
