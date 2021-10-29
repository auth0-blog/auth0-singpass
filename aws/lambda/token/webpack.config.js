/* eslint-disable */

const { resolve } = require("path");
const ESLintPlugin = require("eslint-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const glob = require("glob");

const entry = glob.sync("./src/*.ts").reduce(
    (acc, item) => ({
        ...acc,
        [item.replace("./src/", "").replace(".ts", "")]: item,
    }),
    {}
);

module.exports = {
    entry,

    output: {
        path: resolve(__dirname, "dist/"),
        filename: "[name]/app.js",
        libraryTarget: "commonjs",
    },

    // Resolve .ts and .js extensions
    resolve: {
        extensions: [".ts", ".js"],
    },

    // Target node
    target: "node14",

    devtool: "cheap-source-map",

    // Set the webpack mode
    mode: process.env.NODE_ENV || "production", // "development"

    // Add the TypeScript loader
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: "ts-loader",
            },
        ],
    },

    plugins: [new ESLintPlugin({ extensions: ["ts"] }), new CleanWebpackPlugin()],
};
