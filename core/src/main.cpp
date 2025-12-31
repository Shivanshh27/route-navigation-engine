#include <bits/stdc++.h>
#include "../include/graph.hpp"
using namespace std;

vector<int> dijkstra(Graph &g, int start, int end);
vector<int> astar(Graph &g, int start, int end);

int main(int argc, char* argv[]) {
    // Expected arguments:
    // argv[1] = start node
    // argv[2] = end node
    // argv[3] = algorithm ("astar" or "dijkstra")
    // argv[4] = path to graph.json

    if (argc < 5) {
        cout << "{ \"error\": \"Usage: route <start> <end> <algo> <graph_path>\" }";
        return 1;
    }

    int start = stoi(argv[1]);
    int end = stoi(argv[2]);
    string algo = argv[3];
    string graphPath = argv[4];

    // Load graph
    Graph g(3);  // number of nodes (matches graph.json)
    g.loadFromFile(graphPath);

    vector<int> path;
    auto t1 = chrono::high_resolution_clock::now();

    if (algo == "astar")
        path = astar(g, start, end);
    else
        path = dijkstra(g, start, end);

    auto t2 = chrono::high_resolution_clock::now();
    auto time_us =
        chrono::duration_cast<chrono::microseconds>(t2 - t1).count();

    // Output JSON (Node.js will parse this)
    cout << "{ \"path\": [";
    for (int i = 0; i < (int)path.size(); i++) {
        cout << path[i];
        if (i + 1 < (int)path.size()) cout << ", ";
    }
    cout << "], \"time_us\": " << time_us << " }";

    return 0;
}
