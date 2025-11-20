"""
Agentic Chunker - Intelligent document chunking using LLM
Analyzes document structure and creates semantic chunks with rich metadata
"""
from typing import List, Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from config import settings
import json
import re


class AgenticChunker:
    """
    Intelligent chunker that uses LLM to:
    - Detect document structure (headings, tables, paragraphs)
    - Extract tables as structured JSON
    - Create semantic chunks (not just character-based)
    - Add rich metadata for better retrieval
    """
    
    def __init__(self):
        self.settings = settings
        self._initialize_llm()
    
    @staticmethod
    def _clean_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Remove None values and complex types from metadata for ChromaDB compatibility"""
        cleaned = {}
        for key, value in metadata.items():
            # Skip None values
            if value is None:
                continue
            # Only keep str, int, float, bool
            if isinstance(value, (str, int, float, bool)):
                cleaned[key] = value
            # Convert other types to string
            elif isinstance(value, (list, dict)):
                # Skip complex nested structures
                continue
            else:
                cleaned[key] = str(value)
        return cleaned
    
    def _initialize_llm(self):
        """Initialize LLM for chunking analysis"""
        # ALWAYS use Gemini for agentic chunking (free and fast)
        # Regardless of main LLM provider setting
        try:
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",  # Latest fast and free model
                temperature=0,
                google_api_key=self.settings.google_api_key
            )
            self.provider = "gemini"
            print("Agentic Chunker using Gemini 2.5 Flash (FREE)")
        except Exception as e:
            print(f"Gemini init failed: {e}, falling back to OpenAI")
            # Fallback to OpenAI only if Gemini fails
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0,
                openai_api_key=self.settings.openai_api_key
            )
            self.provider = "openai"
            print("Agentic Chunker using OpenAI GPT-4o-mini (fallback)")
    
    def analyze_and_chunk(self, content: str, filename: str = "") -> List[Dict[str, Any]]:
        """
        Analyze document and create intelligent chunks
        
        Args:
            content: Document text content
            filename: Original filename for context
            
        Returns:
            List of chunks with content and metadata
        """
        print(f"Agentic chunking for: {filename} ({len(content)} chars)")
        
        # For very large documents, split into sections first
        # Gemini 2.5 Flash can handle 1M tokens (~2000 pages)
        # Set limit to 1,000,000 chars (~500 pages) - increased for better coverage
        if len(content) > 1000000:
            print("Very large document detected (>500 pages), using simple chunking")
            return self._chunk_large_document(content, filename)
        
        # Analyze document structure
        print("Analyzing document structure...")
        structure = self._analyze_structure(content, filename)
        print(f"Structure: {structure.get('document_type', 'unknown')}, has_tables: {structure.get('has_tables', False)}")
        
        # Create chunks based on structure
        chunks = self._create_semantic_chunks(content, structure, filename)
        print(f"Created {len(chunks)} intelligent chunks")
        
        return chunks
    
    def _analyze_structure(self, content: str, filename: str) -> Dict[str, Any]:
        """
        Use LLM to analyze document structure
        """
        # Use more content for analysis with Gemini 2.5 Flash's large context
        analysis_length = min(len(content), 50000)  # Up to 50k chars for comprehensive analysis
        
        prompt = f"""Analyze this document and identify its structure.

Document filename: {filename}
Document content (first {analysis_length} chars):
{content[:analysis_length]}

Identify:
1. Document type (curriculum, syllabus, guide, general info, etc.)
2. Main sections (headings/topics)
3. Whether it contains tables (course lists, schedules, etc.)
4. Key metadata (program name, semester, year if mentioned)

Respond in JSON format:
{{
    "document_type": "curriculum|syllabus|guide|info",
    "program": "program name if found",
    "sections": ["section1", "section2", ...],
    "has_tables": true/false,
    "metadata": {{"key": "value"}}
}}
"""
        
        try:
            response = self.llm.invoke(prompt)
            content_text = response.content if hasattr(response, 'content') else str(response)
            
            # Clean JSON from markdown
            content_text = content_text.replace("```json", "").replace("```", "").strip()
            
            structure = json.loads(content_text)
            return structure
        except Exception as e:
            print(f"Structure analysis failed: {e}")
            # Fallback to simple structure
            return {
                "document_type": "general",
                "sections": [],
                "has_tables": False,
                "metadata": {}
            }
    
    def _create_semantic_chunks(
        self, 
        content: str, 
        structure: Dict[str, Any],
        filename: str
    ) -> List[Dict[str, Any]]:
        """
        Create chunks based on semantic structure
        """
        chunks = []
        
        # If document has tables, extract them separately
        if structure.get("has_tables"):
            print("Extracting tables...")
            table_chunks = self._extract_tables(content, structure)
            chunks.extend(table_chunks)
            print(f"Extracted {len(table_chunks)} table chunks")
        
        # Split remaining content by sections or paragraphs
        # Split by double newlines (paragraphs)
        paragraphs = re.split(r'\n\n+', content)
        
        current_chunk = ""
        chunk_index = len(chunks)
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            # If adding this paragraph exceeds chunk size, save current chunk
            if len(current_chunk) + len(para) > self.settings.chunk_size and current_chunk:
                raw_metadata = {
                    "filename": filename,
                    "chunk_index": chunk_index,
                    "document_type": structure.get("document_type", "general"),
                    "program": structure.get("program", ""),
                    "agentic_chunking": True,
                    **structure.get("metadata", {})
                }
                chunks.append({
                    "content": current_chunk.strip(),
                    "metadata": self._clean_metadata(raw_metadata)
                })
                current_chunk = para
                chunk_index += 1
            else:
                current_chunk += "\n\n" + para if current_chunk else para
        
        # Add last chunk
        if current_chunk:
            raw_metadata = {
                "filename": filename,
                "chunk_index": chunk_index,
                "document_type": structure.get("document_type", "general"),
                "program": structure.get("program", ""),
                "agentic_chunking": True,
                **structure.get("metadata", {})
            }
            chunks.append({
                "content": current_chunk.strip(),
                "metadata": self._clean_metadata(raw_metadata)
            })
        
        return chunks
    
    def _extract_tables(self, content: str, structure: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract tables from content and convert to structured format
        """
        # Use more content for table extraction with Gemini 2.5 Flash
        table_extract_length = min(len(content), 100000)  # Up to 100k chars for comprehensive table extraction
        
        prompt = f"""Extract all tables from this document and convert them to structured JSON.

Document content (first {table_extract_length} chars):
{content[:table_extract_length]}

For each table found, create a JSON object with:
- table_type: "course_list", "schedule", "requirements", or "other"
- headers: list of column headers
- rows: list of row data
- metadata: any relevant info (semester, program, etc.)

Respond with JSON array:
[
  {{
    "table_type": "course_list",
    "semester": 1,
    "headers": ["Code", "Course Name", "SKS"],
    "rows": [
      ["MKDU4111", "Pendidikan Agama", "3"],
      ["MKDU4112", "Bahasa Indonesia", "3"]
    ],
    "total_sks": 6
  }}
]

If no tables found, return empty array [].
"""
        
        try:
            response = self.llm.invoke(prompt)
            content_text = response.content if hasattr(response, 'content') else str(response)
            
            # Clean JSON
            content_text = content_text.replace("```json", "").replace("```", "").strip()
            
            tables = json.loads(content_text)
            
            # Convert tables to chunks
            table_chunks = []
            for idx, table in enumerate(tables):
                # Create readable text representation
                text_repr = self._table_to_text(table)
                
                # Prepare metadata without complex nested structures
                raw_metadata = {
                    "type": "table",
                    "table_type": table.get("table_type", "other"),
                    "semester": table.get("semester"),
                    "document_type": structure.get("document_type", "general"),
                    "program": structure.get("program", ""),
                    "agentic_chunking": True,
                    "total_sks": table.get("total_sks")  # Add if exists
                }
                
                table_chunks.append({
                    "content": text_repr,
                    "metadata": self._clean_metadata(raw_metadata)
                })
            
            return table_chunks
            
        except Exception as e:
            print(f"Table extraction failed: {e}")
            return []
    
    def _table_to_text(self, table: Dict[str, Any]) -> str:
        """Convert table JSON to readable text"""
        lines = []
        
        # Add table type header
        if "table_type" in table:
            lines.append(f"=== {table['table_type'].upper().replace('_', ' ')} ===\n")
        
        # Add semester info if available
        if "semester" in table and table["semester"]:
            lines.append(f"Semester: {table['semester']}\n")
        
        # Add headers
        if "headers" in table:
            lines.append(" | ".join(table["headers"]))
            lines.append("-" * 50)
        
        # Add rows
        if "rows" in table:
            for row in table["rows"]:
                lines.append(" | ".join(str(cell) for cell in row))
        
        # Add summary
        if "total_sks" in table:
            lines.append(f"\nTotal SKS: {table['total_sks']}")
        
        return "\n".join(lines)
    
    def _chunk_large_document(self, content: str, filename: str) -> List[Dict[str, Any]]:
        """
        Handle very large documents by splitting into sections first
        """
        print("Using fallback chunking for large document")
        chunks = []
        chunk_size = self.settings.chunk_size
        overlap = self.settings.chunk_overlap
        
        for i in range(0, len(content), chunk_size - overlap):
            chunk_content = content[i:i + chunk_size]
            chunks.append({
                "content": chunk_content,
                "metadata": {
                    "filename": filename,
                    "chunk_index": i // (chunk_size - overlap),
                    "document_type": "large_document",
                    "agentic_chunking": False  # Fallback mode
                }
            })
        
        return chunks
