#include "../include/graph.hpp"
#include <fstream>
#include <sstream>

Graph::Graph(int nodesCount) {
    n = nodesCount;
    adj.resize(n);
    nodes.resize(n);
}

void Graph::loadFromFile(const string &filename) {
    ifstream file(filename);
    string line;

    while (getline(file, line)) {
        if (line.find("\"id\"") != string::npos) {
            int id;
            double x, y;
            sscanf(line.c_str(),
                   " %*[^0-9]%d%*[^0-9]%lf%*[^0-9]%lf",
                   &id, &x, &y);
            nodes[id] = {x, y};
        }

        if (line.find("from") != string::npos) {
            int from, to, weight;
            sscanf(line.c_str(),
                   " %*[^0-9]%d%*[^0-9]%d%*[^0-9]%d",
                   &from, &to, &weight);
            adj[from].push_back({to, weight});
        }
    }
}
