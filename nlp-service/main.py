from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn

# Initialize FastAPI app
app = FastAPI(title="NLP Contract Extraction Service")

# Request/Response Models
class ExtractionRequest(BaseModel):
    text: str

class ExtractedEntity(BaseModel):
    item_name: str
    qty: float
    unit: str
    price: float

def mock_tfidf_vectorization(text: str) -> list:
    """
    Placeholder for TF-IDF Vectorization.
    In a real system, you would use sklearn's TfidfVectorizer:
    vectorizer = TfidfVectorizer()
    return vectorizer.fit_transform([text])
    """
    # Simply returning a mock vector list representing feature weights
    return [0.12, 0.45, 0.88, 0.34]

@app.post("/extract", response_model=List[ExtractedEntity])
def extract_entities(request: ExtractionRequest):
    """
    Simulates NER (Named Entity Recognition) to extract structured
    data (item, quantity, unit, price) from raw contract text.
    """
    # 1. Run placeholder vectorization
    tfidf_features = mock_tfidf_vectorization(request.text)
    
    # 2. Mocking extraction logic based on the text
    # In production, this would pass the text to a trained NLP model (e.g. SpaCy, Transformers)
    
    # Simple hardcoded mock extraction for the MVP
    extracted_items = [
        ExtractedEntity(
            item_name="Dell Latitude 5520",
            qty=10.0,
            unit="pcs",
            price=1200.00
        )
    ]
    
    return extracted_items

if __name__ == "__main__":
    # Run the application using Uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
