import pandas as pd

valid_df = pd.read_csv('./final_netflix_data.csv')

start_ctr = 0

for i in range(15, 5086, 15):
    valid_df[start_ctr:i].to_csv('./data-partitions/netflix-'+str(i)+'.csv', index=False)
    start_ctr += 15