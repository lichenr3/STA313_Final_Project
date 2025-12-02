"""
预处理 Census 数据，生成用于可视化的聚合 JSON 文件
这样可以避免在浏览器中加载和处理大型 CSV 文件
"""

import pandas as pd
import json
from pathlib import Path

# CMA 代码到名称的映射
CMA_NAMES = {
    '535': 'Toronto',
    '462': 'Montréal',
    '505': 'Ottawa–Gatineau',
    '933': 'Vancouver',
    '825': 'Calgary',
    '835': 'Edmonton'
}

# MODE 归一化函数（与 JS 中的逻辑完全一致，保留所有模式）
def normalize_mode(mode_code):
    mode_map = {
        '1': 'Car, driver',
        '2': 'Car, passenger',
        '3': 'Public transit',
        '4': 'Walk',
        '5': 'Bicycle',
        '6': 'Motorcycle',
        '7': 'Taxicab',
        '8': 'Other method',
        '9': 'Other method'  # 9 也映射到 Other method
    }
    return mode_map.get(str(mode_code), 'Unknown')

# 读取和过滤数据
def load_and_filter_data(file_path, year):
    print(f"Loading {file_path}...")
    
    # 只读取需要的列
    usecols = ['CMA', 'POWST', 'TotInc', 'WEIGHT', 'MODE']
    
    df = pd.read_csv(file_path, usecols=usecols, low_memory=False)
    
    print(f"  Raw rows: {len(df)}")
    
    # 过滤条件
    # 1. 只保留目标 CMAs
    target_cmas = [535, 462, 505, 933, 825, 835]
    df = df[df['CMA'].isin(target_cmas)]
    
    # 转换 CMA 为字符串以匹配 JS 代码
    df['CMA'] = df['CMA'].astype(str)
    
    # 2. 只保留 in-person workers (POWST 3 or 4)
    df = df[df['POWST'].isin([3, 4])]
    
    # 3. 收入范围过滤
    df['TotInc'] = pd.to_numeric(df['TotInc'], errors='coerce')
    df = df[(df['TotInc'] > 0) & (df['TotInc'] <= 150000)]
    
    # 4. 确保 WEIGHT 有效
    df['WEIGHT'] = pd.to_numeric(df['WEIGHT'], errors='coerce')
    df = df[df['WEIGHT'] > 0]
    
    # 归一化 MODE
    df['MODE_normalized'] = df['MODE'].apply(normalize_mode)
    df = df[df['MODE_normalized'] != 'Unknown']
    
    print(f"  Filtered rows: {len(df)}")
    
    return df

# 按 CMA 和收入范围聚合数据
def aggregate_data(df_2016, df_2021):
    """
    聚合数据到不同的维度组合
    返回一个嵌套字典，按 CMA -> 收入范围 -> 统计数据
    """
    
    # 定义收入分段（每 10k 一段）
    income_bins = list(range(0, 151000, 10000))
    
    result = {
        'cma_names': CMA_NAMES,
        'income_bins': income_bins,
        'data': {}
    }
    
    # 对每个 CMA 进行聚合
    all_cmas = ['overview'] + list(CMA_NAMES.keys())
    
    for cma in all_cmas:
        result['data'][cma] = {}
        
        # 过滤当前 CMA 的数据（overview 表示所有 CMA）
        if cma == 'overview':
            df_2016_cma = df_2016.copy()
            df_2021_cma = df_2021.copy()
        else:
            df_2016_cma = df_2016[df_2016['CMA'] == cma].copy()
            df_2021_cma = df_2021[df_2021['CMA'] == cma].copy()
        
        # 对每个收入分段进行聚合
        for i in range(len(income_bins) - 1):
            income_min = income_bins[i]
            income_max = income_bins[i + 1]
            income_key = f"{income_min}-{income_max}"
            
            # 过滤收入范围
            df_2016_income = df_2016_cma[
                (df_2016_cma['TotInc'] >= income_min) & 
                (df_2016_cma['TotInc'] < income_max)
            ]
            df_2021_income = df_2021_cma[
                (df_2021_cma['TotInc'] >= income_min) & 
                (df_2021_cma['TotInc'] < income_max)
            ]
            
            # 按 MODE 聚合
            mode_counts_2016 = df_2016_income.groupby('MODE_normalized')['WEIGHT'].sum().to_dict()
            mode_counts_2021 = df_2021_income.groupby('MODE_normalized')['WEIGHT'].sum().to_dict()
            
            # 按 CMA 聚合（仅 overview 需要）
            if cma == 'overview':
                cma_counts_2016 = df_2016_income.groupby('CMA')['WEIGHT'].sum().to_dict()
                cma_counts_2021 = df_2021_income.groupby('CMA')['WEIGHT'].sum().to_dict()
            else:
                cma_counts_2016 = {cma: df_2016_income['WEIGHT'].sum()}
                cma_counts_2021 = {cma: df_2021_income['WEIGHT'].sum()}
            
            result['data'][cma][income_key] = {
                'mode_counts_2016': mode_counts_2016,
                'mode_counts_2021': mode_counts_2021,
                'cma_counts_2016': cma_counts_2016,
                'cma_counts_2021': cma_counts_2021,
                'total_2016': df_2016_income['WEIGHT'].sum(),
                'total_2021': df_2021_income['WEIGHT'].sum()
            }
    
    return result

def main():
    # 加载数据
    df_2016 = load_and_filter_data('data/census_16_metro.csv', '2016')
    df_2021 = load_and_filter_data('data/census_21_metro.csv', '2021')
    
    print("\nAggregating data...")
    aggregated = aggregate_data(df_2016, df_2021)
    
    # 保存为 JSON
    output_file = 'data/vis1_aggregated.json'
    print(f"\nSaving aggregated data to {output_file}...")
    
    with open(output_file, 'w') as f:
        json.dump(aggregated, f, separators=(',', ':'))  # 压缩输出
    
    # 检查文件大小
    file_size = Path(output_file).stat().st_size / (1024 * 1024)
    print(f"✓ Done! File size: {file_size:.2f} MB")
    
    # 打印一些统计信息
    print(f"\nStatistics:")
    print(f"  CMAs: {len(aggregated['data'])}")
    print(f"  Income bins: {len(aggregated['income_bins']) - 1}")
    for cma, cma_data in list(aggregated['data'].items())[:2]:
        cma_name = CMA_NAMES.get(cma, cma)
        print(f"  {cma_name}: {len(cma_data)} income ranges")

if __name__ == '__main__':
    main()
