"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

interface Props {
    content: string;
}

export default function MarkdownRenderer({ content }: Props) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ node, className, children, ...props }) {
                    //extract language from classname (example: "language-js")
                    const match = /language-(\w+)/.exec(className || "")
                    const language = match ? match[1] : ""

                    //if code block has language -> use syntaxHighlighter
                    if (language) {
                        return (
                            <SyntaxHighlighter
                                style={oneDark as any} // <-- fix style typing issue
                                language={language}
                                PreTag="div"
                            >
                                {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                        )
                    }

                    //otherwise render inline code normally
                    return(
                        <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                            {children}
                        </code>
                    )
                }
            }}
            >
                {content}
            </ReactMarkdown>
    )
}