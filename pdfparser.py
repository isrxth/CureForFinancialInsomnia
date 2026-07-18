import os
import time
import re
from unstract.llmwhisperer import LLMWhispererClientV2

def extract_financial_dict_from_pdf(pdf_file_path: str) -> dict:
    """
    Uploads a corporate report PDF to LLMWhisperer, polls until processed,
    and runs a text regex loop to parse key baseline metrics.
    """
    # 1. Initialize client using the environment variable
    client = LLMWhispererClientV2(
        base_url='https://llmwhisperer-api.eu-west.unstract.com/api/v2',
        api_key=os.getenv('API_KEY')
    )
    
    # 2. Submit the PDF for layout processing
    print("📤 Sending PDF bytes to Unstract API cloud...")
    result = client.whisper(file_path=pdf_file_path)
    print(f"✅ Received hash receipt: {result['whisper_hash']}")
    
    # 3. Asynchronous status polling loop
    while True:
        status = client.whisper_status(whisper_hash=result['whisper_hash'])
        if status['status'] == 'processed':
            resultx = client.whisper_retrieve(whisper_hash=result['whisper_hash'])
            break
        time.sleep(5)
        
    extracted_table = resultx['extraction']['result_text']
    
    # 4. Text-Line Regex Extraction Logic from your notebook
    lines = extracted_table.strip().split('\n')
    target_yrs = ["2025/26", "2024/25", "2023/24", "2022/23", "2021/22", "2020/21"]
    data_store = {year: {} for year in target_yrs}

    hooks = {
        "Revenue": "revenue",
        "Profit/(Loss) before taxation": "pbt",
        "Total equity": "total_equity",
        "Total borrowings": "total_borrowings",
        "Current assets": "current_assets",
        "Total assets employed": "total_assets",
        "Current ratio (No. of times)": "current_ratio",
        "Quick asset ratio": "quick_ratio",
        "Gearing ratio (%)": "gearing_ratio"
    }

    for line in lines:
        clean_line = " ".join(line.split())
        for text_label, json_key in hooks.items():
            if text_label == "Revenue" and "Revenue reserve" in clean_line:
                continue

            if text_label in clean_line:
                number_part = clean_line[len(text_label):].strip()
                tokens = number_part.split()

                clean_numbers = []
                for token in tokens:
                    is_negative = '(' in token 
                    cleaned = token.replace(',', '').replace('(', '').replace(')', '')

                    if cleaned.replace('.', '', 1).isdigit():
                        val = float(cleaned)
                        if is_negative:
                            val = -val
                        clean_numbers.append(val)

                for idx, year in enumerate(target_yrs):
                    if idx < len(clean_numbers):
                        data_store[year][json_key] = clean_numbers[idx]
                        
    return data_store