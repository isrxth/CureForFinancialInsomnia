import os
import time
import re
from unstract.llmwhisperer import LLMWhispererClientV2

def parse_number_from_token(token: str):
    """
    Parses numeric values from LLMWhisperer tokens, cleanly handling negative
    numbers (-1,948,055 or (1,948,055)), percentages, and hyphens/placeholders.
    Ignores year ranges like 2024-25 or 2025/26.
    """
    t = token.replace('−', '-').replace('–', '-').replace('—', '-')
    
    # Ignore year ranges (e.g. 2024-25 or 2025/26)
    if re.match(r'^\d{4}[-/]\d{2,4}$', t):
        return None
        
    is_negative = False
    cleaned_t = t.strip()
    if cleaned_t.startswith('(') and cleaned_t.endswith(')'):
        is_negative = True
    elif cleaned_t.startswith('-'):
        is_negative = True
        
    cleaned = t.replace(',', '').replace('(', '').replace(')', '').replace('%', '').replace('$', '').replace('€', '').replace('£', '').replace('-', '').strip()
    if cleaned.replace('.', '', 1).isdigit():
        val = float(cleaned)
        return -val if is_negative else val
    elif cleaned == '' or cleaned.lower() in ['n/a', 'na', 'nil']:
        return 0.0
    return None

def extract_raw_text_from_pdf(pdf_file_path: str) -> str:
    """
    Uploads a corporate report PDF to LLMWhisperer, polls until processed,
    and returns the layout-preserved raw result_text.
    """
    client = LLMWhispererClientV2(
        base_url='https://llmwhisperer-api.eu-west.unstract.com/api/v2',
        api_key=os.getenv('API_KEY')
    )
    
    print("📤 Sending PDF bytes to Unstract API cloud...")
    result = client.whisper(file_path=pdf_file_path)
    print(f"✅ Received hash receipt: {result['whisper_hash']}")
    
    while True:
        status = client.whisper_status(whisper_hash=result['whisper_hash'])
        if status['status'] == 'processed':
            resultx = client.whisper_retrieve(whisper_hash=result['whisper_hash'])
            break
        time.sleep(3)
        
    return resultx['extraction']['result_text']

def extract_candidates_from_text(raw_text: str):
    """
    Parses LLMWhisperer text to extract candidate years, candidate rows with line indices,
    column index guide preview, and default metric mappings.
    """
    lines = raw_text.strip().split('\n')
    
    # Extract candidate years
    year_pattern = re.compile(r'\b\d{4}(?:/\d{2,4}|-\d{2,4})?\b')
    all_year_tokens = year_pattern.findall(raw_text)
    
    seen_years = set()
    candidate_years = []
    for yr in all_year_tokens:
        if yr not in seen_years:
            seen_years.add(yr)
            candidate_years.append(yr)
            
    candidate_rows = []
    guide_rows = []
    
    for i, line in enumerate(lines):
        tokens = line.strip().split()
        if not tokens:
            continue
        
        nums = []
        text_parts = []
        for tok in tokens:
            val = parse_number_from_token(tok)
            if val is not None:
                nums.append(val)
            else:
                text_parts.append(tok)
                
        if nums:
            label = " ".join(text_parts).strip()
            nums_preview = ", ".join(str(n) for n in nums[:3])
            if len(nums) > 3:
                nums_preview += "..."
            
            display_lbl = label if label else "[No Label]"
            display_name = f"Row {i+1}: {display_lbl} | [{nums_preview}]"
            
            row_item = {
                "display": display_name,
                "line_idx": i,
                "label": label,
                "numbers_preview": [str(n) for n in nums[:6]]
            }
            candidate_rows.append(row_item)
            
            if len(guide_rows) < 4:
                num_tokens = [t for t in tokens if parse_number_from_token(t) is not None]
                guide_rows.append({
                    "line_idx": i,
                    "label": display_lbl,
                    "columns": num_tokens[:8]
                })

    target_keys = {
        "revenue": "Revenue",
        "pbt": "Profit/(Loss) before taxation",
        "total_equity": "Total equity",
        "total_borrowings": "Total borrowings",
        "current_assets": "Current assets",
        "total_assets": "Total assets employed",
        "current_ratio": "Current ratio (No. of times)",
        "quick_ratio": "Quick asset ratio",
        "gearing_ratio": "Gearing ratio (%)"
    }

    default_mappings = {}
    for json_key, default_lbl in target_keys.items():
        selected_line_idx = -1
        for row in candidate_rows:
            lbl = row['label']
            if lbl and (default_lbl.lower() in lbl.lower() or lbl.lower() in default_lbl.lower()):
                selected_line_idx = row['line_idx']
                break
                
        if selected_line_idx == -1:
            if json_key == "revenue":
                for row in candidate_rows:
                    lbl = row['label']
                    if lbl and ("revenue" in lbl.lower() or "turnover" in lbl.lower() or "income" in lbl.lower()) and "reserve" not in lbl.lower():
                        selected_line_idx = row['line_idx']
                        break
            elif json_key == "pbt":
                for row in candidate_rows:
                    lbl = row['label']
                    if lbl and ("before taxation" in lbl.lower() or "before tax" in lbl.lower() or "pbt" in lbl.lower()):
                        selected_line_idx = row['line_idx']
                        break
            elif json_key == "total_assets":
                for row in candidate_rows:
                    lbl = row['label']
                    if lbl and ("total assets" in lbl.lower()):
                        selected_line_idx = row['line_idx']
                        break

        default_mappings[json_key] = selected_line_idx

    return candidate_years, candidate_rows, guide_rows, default_mappings

def parse_metrics_with_mappings(raw_text: str, target_yrs: list, col_indices: list, selected_mappings: dict) -> dict:
    """
    Parses numbers for mapped line indices and column indices across target years.
    Supports direct line indices (int) and multi-row formulas:
    { "type": "formula", "terms": [ { "op": "+", "line_idx": 10 }, { "op": "+", "line_idx": 11 } ] }
    """
    lines = raw_text.strip().split('\n')
    data_store = {year: {} for year in target_yrs}
    
    if not col_indices:
        col_indices = list(range(len(target_yrs)))
        
    def get_line_numbers(line_idx):
        if line_idx < 0 or line_idx >= len(lines):
            return []
        tokens = lines[line_idx].strip().split()
        return [parse_number_from_token(tok) for tok in tokens if parse_number_from_token(tok) is not None]

    for json_key, mapping in selected_mappings.items():
        if isinstance(mapping, (int, float)):
            line_idx = int(mapping)
            if line_idx < 0 or line_idx >= len(lines):
                continue
            clean_numbers = get_line_numbers(line_idx)
            for year_idx, year in enumerate(target_yrs):
                if year_idx < len(col_indices):
                    target_col_idx = col_indices[year_idx]
                    if target_col_idx < len(clean_numbers):
                        data_store[year][json_key] = clean_numbers[target_col_idx]

        elif isinstance(mapping, dict) and mapping.get("type") == "formula":
            terms = mapping.get("terms", [])
            for year_idx, year in enumerate(target_yrs):
                if year_idx < len(col_indices):
                    target_col_idx = col_indices[year_idx]
                    tot_val = 0.0
                    has_valid = False
                    for idx_t, term in enumerate(terms):
                        line_idx = term.get("line_idx", -1)
                        op = "+" if idx_t == 0 else term.get("op", "+")
                        if line_idx >= 0 and line_idx < len(lines):
                            nums = get_line_numbers(line_idx)
                            val = nums[target_col_idx] if target_col_idx < len(nums) else 0.0
                            if op == "+":
                                tot_val += val
                            else:
                                tot_val -= val
                            has_valid = True
                    if has_valid:
                        data_store[year][json_key] = tot_val

    target_keys = ["revenue", "pbt", "total_equity", "total_borrowings", "current_assets", "total_assets", "current_ratio", "quick_ratio", "gearing_ratio"]
    for year in data_store:
        for k in target_keys:
            if k not in data_store[year]:
                data_store[year][k] = 0.0

    return data_store