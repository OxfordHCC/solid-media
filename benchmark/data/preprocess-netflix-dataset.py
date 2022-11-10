import pandas as pd

from tmdbv3api import TMDb
from tmdbv3api import Movie

tmdb = TMDb()
tmdb.api_key = 'e70f4a66202d9b5df3586802586bc7d2'
tmdb.language = 'en'
tmdb.debug = True

movie = Movie()

df = pd.read_csv('./netflix_titles.csv', encoding='utf-8')

valid_titles = []

# checking all netflix movies that exist on tmDB (the API we are using for movie search on SolidFlix)
for title in df['title']:
    search = movie.search(title)
    for res in search:
        if res.title == title:
            valid_titles.append(title)
            break

print('movies count: ' + len(valid_titles))

valid_df = pd.DataFrame({'title': valid_titles})
valid_df['date'] = pd.to_datetime('today').strftime("%m/%d/%Y")

valid_df.to_csv('./final_netflix_data.csv', index=False)