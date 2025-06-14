"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, CornerDownRight, MessageSquare, Quote } from "lucide-react"
import { motion } from "framer-motion"

interface ContentItem {
  content: string;
  quote: string;
  relevance: number;
}

interface Subtopic {
  title: string;
  content_items: ContentItem[];
}

interface Topic {
  id: string;
  title: string;
  color: string;
  subtopics: Subtopic[];
}

interface RootNode {
  text: string;
  subtitle: string;
}

interface SummaryData {
  title: string;
  summary: string;
  root_node: RootNode;
  main_topics: Topic[];
}

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: SummaryData | null;
  personaName?: string;
  personaImage?: string;
}

const Node = ({ children, delay }: { children: React.ReactNode, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3, delay }}
    className="relative"
  >
    {children}
  </motion.div>
);

export function SummaryModal({ isOpen, onClose, summaryData, personaImage }: SummaryModalProps) {
  if (!summaryData) return null;

  let delay = 0.1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col bg-white dark:bg-zinc-900">
        {/* 헤더 */}
        <DialogHeader className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {summaryData.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-zinc-600 dark:text-zinc-400 pl-7">
            {summaryData.summary}
          </DialogDescription>
        </DialogHeader>

        {/* 대화 요약 컨텐츠 */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 text-sm text-zinc-800 dark:text-zinc-200">
              {/* 루트 노드 */}
              <Node delay={delay}>
                <div className="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden border border-zinc-300 dark:border-zinc-600">
                    {personaImage ? (
                      <img
                        src={personaImage}
                        alt={summaryData.root_node.text}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {summaryData.root_node.text.substring(0, 2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-base">{summaryData.root_node.text}</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{summaryData.root_node.subtitle}</p>
                  </div>
                </div>
              </Node>
              
              {/* 메인 토픽들 */}
              <div className="mt-4 ml-5 space-y-4">
                {summaryData.main_topics.map((topic) => {
                  delay += 0.1;
                  return (
                    <Node key={topic.id} delay={delay}>
                      <div className="flex">
                        <div className="w-5 flex-shrink-0 mr-3 mt-1.5 flex flex-col items-center">
                          <CornerDownRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                          <div className="w-px h-full" style={{ backgroundColor: `${topic.color}40`}}></div>
                        </div>

                        <div className="flex-1">
                          {/* 주제 헤더 */}
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: topic.color }} />
                            <h3 className="font-semibold" style={{ color: topic.color }}>{topic.title}</h3>
                          </div>
                          
                          {/* 세부 주제들 */}
                          <div className="mt-2 ml-5 space-y-3">
                            {topic.subtopics.map((subtopic) => {
                              delay += 0.05;
                              return (
                                <Node key={subtopic.title} delay={delay}>
                                  <div className="flex">
                                    <div className="w-5 flex-shrink-0 mr-3 mt-1.5 flex flex-col items-center">
                                      <CornerDownRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                      <div className="w-px h-full bg-zinc-200 dark:bg-zinc-700"></div>
                                    </div>
                                    <div className="flex-1">
                                      {/* 세부 주제 헤더 */}
                                      <div className="flex items-center gap-2">
                                        <MessageSquare className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                                        <h4 className="font-medium text-zinc-800 dark:text-zinc-200">{subtopic.title}</h4>
                                      </div>

                                      {/* 내용 아이템들 */}
                                      <div className="mt-2 ml-5 space-y-2">
                                        {subtopic.content_items.map((item) => {
                                          delay += 0.02;
                                          return (
                                            <Node key={item.content} delay={delay}>
                                              <div className="text-xs p-3 bg-white dark:bg-zinc-800/50 rounded-md border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
                                                <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.content}</p>
                                                <div className="mt-1.5 flex items-start gap-1.5 text-zinc-500 dark:text-zinc-400 italic">
                                                  <Quote className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                                  <span>"{item.quote}"</span>
                                                </div>
                                              </div>
                                            </Node>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </Node>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </Node>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}