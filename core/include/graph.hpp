#pragma once
#include <vector>
#include <string>
using namespace std;

struct Edge {
    int to;
    int weight;
};

struct Node {
    double x;
    double y;
};

struct Graph {
    int n;
    vector<vector<Edge>> adj;
    vector<Node> nodes;

    Graph(int nodes);
    void loadFromFile(const string &filename);
};
