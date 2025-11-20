"""
Document Agent with LangChain for complex reasoning and multi-step queries
"""
from typing import Dict, Any, List, Optional
from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import Tool
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from config import settings
import re
import json


class DocumentAgent:
    """
    Intelligent Document Agent that can:
    - Search documents with RAG
    - Extract and compare tables
    - Perform calculations
    - Multi-step reasoning
    """
    
    def __init__(self, rag_engine):
        self.rag_engine = rag_engine
        self.settings = settings
        self._initialize_llm()
        self._initialize_tools()
        self._initialize_agent()
    
    def _initialize_llm(self):
        """Initialize LLM for agent"""
        if self.settings.llm_provider == "openai":
            self.llm = ChatOpenAI(
                model=self.settings.llm_model,
                temperature=0,  # Deterministic for agent
                openai_api_key=self.settings.openai_api_key
            )
        elif self.settings.llm_provider == "gemini":
            self.llm = ChatGoogleGenerativeAI(
                model=self.settings.llm_model,
                temperature=0,
                google_api_key=self.settings.google_api_key
            )
        else:
            # Groq - fallback to OpenAI for agent (Groq doesn't work well with agents yet)
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0,
                openai_api_key=self.settings.openai_api_key
            )
    
    def _initialize_tools(self):
        """Initialize tools for the agent"""
        
        # Tool 1: RAG Search
        def rag_search(query: str) -> str:
            """Search knowledge base for relevant information about UT curriculum, programs, etc."""
            try:
                result = self.rag_engine.query(query, top_k=10)
                # Return only the answer and top sources
                sources_text = "\n".join([
                    f"- {src['content'][:200]}..." 
                    for src in result.get('sources', [])[:3]
                ])
                return f"Answer: {result['answer']}\n\nTop Sources:\n{sources_text}"
            except Exception as e:
                return f"Error searching: {str(e)}"
        
        # Tool 2: Extract Table Data
        def extract_table(query: str) -> str:
            """Extract structured table data (courses, SKS, etc.) from documents. Query should specify what table to extract."""
            try:
                result = self.rag_engine.query(query, top_k=5)
                # Look for table-like patterns in sources
                tables = []
                for src in result.get('sources', []):
                    content = src['content']
                    # Simple table detection (lines with | or tabs)
                    if '|' in content or '\t' in content:
                        tables.append(content)
                
                if tables:
                    return f"Found {len(tables)} table(s):\n\n" + "\n---\n".join(tables[:2])
                else:
                    return "No tables found. Try searching with more specific keywords."
            except Exception as e:
                return f"Error extracting table: {str(e)}"
        
        # Tool 3: Calculator
        def calculator(expression: str) -> str:
            """Perform mathematical calculations. Input should be a valid Python expression (e.g., '2+2', '10*5', 'sum([1,2,3])')"""
            try:
                # Safe eval with limited scope
                allowed_names = {"sum": sum, "len": len, "max": max, "min": min, "abs": abs}
                result = eval(expression, {"__builtins__": {}}, allowed_names)
                return f"Result: {result}"
            except Exception as e:
                return f"Calculation error: {str(e)}"
        
        # Tool 4: Compare Documents
        def compare_docs(query: str) -> str:
            """Compare two or more documents/programs. Query should specify what to compare (e.g., 'compare S1 Manajemen vs S1 Akuntansi')"""
            try:
                # Extract comparison keywords
                result = self.rag_engine.query(query, top_k=15)
                return f"Comparison data:\n{result['answer']}\n\nBased on {len(result.get('sources', []))} sources."
            except Exception as e:
                return f"Error comparing: {str(e)}"
        
        # Tool 5: List Documents
        def list_documents(category: str = "") -> str:
            """List all available documents in the knowledge base. Optionally filter by category."""
            try:
                docs = self.rag_engine.list_documents()
                if category:
                    docs = [d for d in docs if category.lower() in str(d.get('metadata', {})).lower()]
                
                doc_list = "\n".join([
                    f"- {d.get('filename', d.get('document_id', 'Unknown'))} ({d.get('chunk_count', 0)} chunks)"
                    for d in docs[:10]
                ])
                return f"Found {len(docs)} document(s):\n{doc_list}"
            except Exception as e:
                return f"Error listing documents: {str(e)}"
        
        # Create LangChain tools
        self.tools = [
            Tool(
                name="RAG_Search",
                func=rag_search,
                description="Search the knowledge base for information about UT programs, curriculum, courses, requirements, etc. Use this for general questions."
            ),
            Tool(
                name="Extract_Table",
                func=extract_table,
                description="Extract structured table data like course lists, SKS, semester breakdown. Use when you need specific tabular information."
            ),
            Tool(
                name="Calculator",
                func=calculator,
                description="Perform mathematical calculations like summing SKS, counting courses, etc. Input should be a valid Python expression."
            ),
            Tool(
                name="Compare_Documents",
                func=compare_docs,
                description="Compare two or more programs, curricula, or documents. Use when question asks to compare or find differences."
            ),
            Tool(
                name="List_Documents",
                func=list_documents,
                description="List all available documents in the knowledge base. Useful to know what information is available."
            )
        ]
    
    def _initialize_agent(self):
        """Initialize the ReAct agent"""
        try:
            # Create ReAct prompt template manually
            template = """Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}"""
            
            prompt = PromptTemplate.from_template(template)
            
            # Create agent
            agent = create_react_agent(self.llm, self.tools, prompt)
            
            # Create executor
            self.agent_executor = AgentExecutor(
                agent=agent,
                tools=self.tools,
                verbose=True,
                max_iterations=5,  # Limit iterations to prevent infinite loops
                handle_parsing_errors=True
            )
        except Exception as e:
            print(f"Warning: Could not initialize agent: {e}")
            # Fallback: create simple agent without hub
            self.agent_executor = None
    
    def query(self, query: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Process query with document agent
        
        Args:
            query: User question
            history: Conversation history (optional)
            
        Returns:
            Dictionary with answer and metadata
        """
        if self.agent_executor is None:
            # Fallback to regular RAG if agent failed to initialize
            return self.rag_engine.query(query, history=history)
        
        try:
            # Add history context if provided
            full_query = query
            if history:
                history_str = "\n".join([
                    f"{msg['role']}: {msg['content']}" 
                    for msg in history[-3:]  # Last 3 messages
                ])
                full_query = f"Previous conversation:\n{history_str}\n\nCurrent question: {query}"
            
            # Run agent
            result = self.agent_executor.invoke({"input": full_query})
            
            return {
                "answer": result.get("output", "No answer generated"),
                "sources": [],  # Agent doesn't return sources in same format
                "query": query,
                "agent_used": True,
                "intermediate_steps": len(result.get("intermediate_steps", []))
            }
            
        except Exception as e:
            print(f"Agent error: {e}")
            # Fallback to regular RAG
            return self.rag_engine.query(query, history=history)
