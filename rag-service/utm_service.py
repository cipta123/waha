import csv
import os
from typing import List, Dict, Any, Optional

class UTMService:
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.data_by_nim: Dict[str, List[Dict[str, Any]]] = {}
        self.is_loaded = False
        # Load data immediately upon initialization
        self._load_data()

    def _load_data(self):
        """Load CSV data into memory indexed by NIM"""
        if not os.path.exists(self.csv_path):
            print(f"Warning: UTM data file not found at {self.csv_path}")
            return

        try:
            with open(self.csv_path, mode='r', encoding='utf-8') as f:
                # Read first few bytes to detect format
                sample = f.read(1024)
                f.seek(0)
                
                # Simple detection: count semicolons vs commas
                if sample.count(';') > sample.count(','):
                    delimiter = ';'
                else:
                    delimiter = ','

                reader = csv.DictReader(f, delimiter=delimiter)
                
                # Clean column names (remove quotes if any)
                if reader.fieldnames:
                    reader.fieldnames = [name.replace('"', '').strip() for name in reader.fieldnames]
                
                count = 0
                self.data_by_nim = {}
                
                for row in reader:
                    # Clean values
                    clean_row = {k: v.replace('"', '').strip() for k, v in row.items() if k}
                    
                    nim = clean_row.get('Nim')
                    if nim:
                        if nim not in self.data_by_nim:
                            self.data_by_nim[nim] = []
                        self.data_by_nim[nim].append(clean_row)
                        count += 1
                
                self.is_loaded = True
                print(f"UTM Service: Loaded {count} records for {len(self.data_by_nim)} students.")
                
        except Exception as e:
            print(f"Error loading UTM data: {e}")

    def search_by_nim(self, nim: str) -> List[Dict[str, Any]]:
        """Search UTM schedule by NIM"""
        if not self.is_loaded:
            self._load_data()
            
        # Clean input NIM (remove spaces, dots)
        clean_nim = nim.strip().replace(' ', '').replace('.', '')
        return self.data_by_nim.get(clean_nim, [])

    def reload(self):
        """Force reload data from file"""
        self._load_data()
