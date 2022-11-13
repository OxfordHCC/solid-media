import pandas as pd
import scipy.sparse as sp
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from tmdbv3api import TMDb
from tmdbv3api import Movie

import random

# tmdb setup
tmdb = TMDb()
tmdb.api_key = 'e70f4a66202d9b5df3586802586bc7d2'
tmdb.language = 'en'
tmdb.debug = True
movie = Movie()

def get_data():
        movie_data = pd.read_csv('dataset/movie_data.csv')
        movie_data['original_title'] = movie_data['original_title'].str.lower()
        return movie_data

def combine_data(data):
        data_recommend = data.drop(columns=['movie_id', 'original_title','plot'])
        data_recommend['combine'] = data_recommend[data_recommend.columns[0:2]].apply(
                                                                        lambda x: ','.join(x.dropna().astype(str)),axis=1)
        data_recommend = data_recommend.drop(columns=['cast','genres'])
        return data_recommend
        
def transform_data(data_combine, data_plot):
        count = CountVectorizer(stop_words='english')
        count_matrix = count.fit_transform(data_combine['combine'])

        tfidf = TfidfVectorizer(stop_words='english')
        tfidf_matrix = tfidf.fit_transform(data_plot['plot'].values.astype('U'))

        combine_sparse = sp.hstack([count_matrix, tfidf_matrix], format='csr')
        cosine_sim = cosine_similarity(combine_sparse, combine_sparse)
        
        return cosine_sim

def recommend_movies(title, data, combine, transform):
        indices = pd.Series(data.index, index = data['original_title'])
        index = indices[title]

        sim_scores = list(enumerate(transform[index]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        sim_scores = sim_scores[1:6]

        return sim_scores

def check_movies(movies):
    final_movies = []

    for m in movies:
        search = movie.search(m)
        for res in search:
            if res.title.lower() == m.lower():
                final_movies.append(m)

    return final_movies

def results(movies):
    find_movie = get_data()
    combine_result = combine_data(find_movie)
    transform_result = transform_data(combine_result, find_movie)

    final_sim_scores, tmdb_recommendations = [], []

    for movie_name in movies:
        movie_name = movie_name.lower()

        if movie_name not in find_movie['original_title'].unique():
            search = movie.search(movie_name)
            movie_id = None
            for res in search:
                if res.title.lower() == movie_name.lower():
                    movie_id = res.id

            if movie_id is not None:
                recos = movie.recommendations(movie_id)
                for reco in recos:
                    tmdb_recommendations.append(reco.title)

        else:
            curr_sim_scores = recommend_movies(movie_name, find_movie, combine_result, transform_result)
            final_sim_scores += curr_sim_scores

    final_sim_scores = sorted(final_sim_scores, key=lambda x: x[1], reverse=True)
    final_sim_scores = final_sim_scores[1:6]
    movie_indices = [i[0] for i in final_sim_scores]
    movie_titles = find_movie['original_title'].iloc[movie_indices].tolist()
    movie_titles = check_movies(movie_titles)
    movie_titles += tmdb_recommendations
    return random.sample(movie_titles, 5)
