import pandas as pd

def run_financial_analysis_pipeline(extracted_dict: dict):
    """
    Takes a clean multi-year extracted dictionary asset, executes
    all ratio and Altman analysis parameters, and returns split datasets.
    """
    # 1. Instantiate the DataFrame base structure
    df = pd.DataFrame(extracted_dict).T
    df.index.name = 'Year'
    df = df.reset_index()

    # 2. Comprehensive Math Calculations Block
    analysis_df = df.copy()
    
    # Dynamic baseline year index (last row)
    base_year_idx = max(0, len(analysis_df) - 1)
    base_year_row = analysis_df.loc[base_year_idx]
    core_metrics = ['revenue', 'pbt', 'total_equity', 'total_borrowings', 'current_assets', 'total_assets']

    # Ensure numeric columns and handle division by zero
    for metric in core_metrics + ['current_ratio', 'quick_ratio', 'gearing_ratio']:
        if metric in analysis_df.columns:
            analysis_df[metric] = pd.to_numeric(analysis_df[metric]).fillna(0.0)
        else:
            analysis_df[metric] = 0.0

    safe_current_ratio = analysis_df['current_ratio'].replace(0, 1.0)
    current_liabs = analysis_df['current_assets'] / safe_current_ratio
    analysis_df['net_working_capital_abs'] = analysis_df['current_assets'] - current_liabs

    for metric in core_metrics:
        analysis_df[f'{metric}_horizontal_growth_%'] = analysis_df[metric].pct_change(-1) * 100
        base_val = base_year_row[metric] if base_year_row[metric] != 0 else 1.0
        analysis_df[f'{metric}_trend_index'] = (analysis_df[metric] / base_val) * 100

    safe_total_assets = analysis_df['total_assets'].replace(0, 1.0)
    safe_revenue = analysis_df['revenue'].replace(0, 1.0)

    analysis_df['current_assets_vertical_%'] = (analysis_df['current_assets'] / safe_total_assets) * 100
    analysis_df['total_equity_vertical_%'] = (analysis_df['total_equity'] / safe_total_assets) * 100
    analysis_df['borrowings_vertical_%'] = (analysis_df['total_borrowings'] / safe_total_assets) * 100
    analysis_df['pbt_vertical_margin_%'] = (analysis_df['pbt'] / safe_revenue) * 100

    analysis_df['net_profit_margin_%'] = (analysis_df['pbt'] / safe_revenue) * 100
    analysis_df['return_on_assets_roa_%'] = (analysis_df['pbt'] / safe_total_assets) * 100
    safe_total_equity = analysis_df['total_equity'].replace(0, 1.0)
    analysis_df['return_on_equity_roe_%'] = (analysis_df['pbt'] / safe_total_equity) * 100
    analysis_df['working_capital_to_assets_%'] = (analysis_df['net_working_capital_abs'] / safe_total_assets) * 100
    analysis_df['debt_to_equity_ratio'] = analysis_df['total_borrowings'] / safe_total_equity
    analysis_df['equity_to_total_assets_%'] = (analysis_df['total_equity'] / safe_total_assets) * 100

    # Altman Z-Score Parameterizations
    analysis_df['Z_X1'] = analysis_df['net_working_capital_abs'] / safe_total_assets
    analysis_df['Z_X2'] = analysis_df['total_equity'] / safe_total_assets
    analysis_df['Z_X3'] = analysis_df['pbt'] / safe_total_assets
    safe_total_borrowings = analysis_df['total_borrowings'].replace(0, 1.0)
    analysis_df['Z_X4'] = analysis_df['total_equity'] / safe_total_borrowings
    analysis_df['Z_X5'] = analysis_df['revenue'] / safe_total_assets

    analysis_df['altman_z_score'] = (1.2 * analysis_df['Z_X1']) + (1.4 * analysis_df['Z_X2']) + \
                                   (3.3 * analysis_df['Z_X3']) + (0.6 * analysis_df['Z_X4']) + \
                                   (0.999 * analysis_df['Z_X5'])

    def categorize_z_zone(z):
        if z > 2.90: return "Safe Zone"
        elif z < 1.23: return "Distress Zone"
        return "Grey Zone"

    analysis_df['altman_risk_classification'] = analysis_df['altman_z_score'].apply(categorize_z_zone)
    analysis_df = analysis_df.round(2)

    # 3. Data Split and Dynamic Trimming Structures
    original_cols = ['Year', 'revenue', 'pbt', 'total_equity', 'total_borrowings', 
                     'current_assets', 'total_assets', 'gearing_ratio', 'current_ratio', 'quick_ratio']
    
    original_df = analysis_df[original_cols].copy()
    
    trim_len = max(1, len(analysis_df) - 1)
    analysis_cols = [col for col in analysis_df.columns if col not in original_cols or col == 'Year']
    analysis_results_df = analysis_df[analysis_cols].iloc[:trim_len].copy()

    return original_df.to_dict(orient="records"), analysis_results_df.to_dict(orient="records")