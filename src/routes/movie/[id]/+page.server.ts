import type { PageServerLoad } from './$types';
import type { Action, Actions } from './$types';
import { database } from '$lib/database';
import { error, fail } from '@sveltejs/kit'

import 'dotenv/config'

export const load: PageServerLoad = async ({params,locals}) => {
	const movieId = Number(params.id)
	let favorited = undefined;
	let liked = undefined;
	let likes = 0;
	//Fetch the details for the movie by ID
	const response = await fetch(
		`https://api.themoviedb.org/3/movie/${params.id}?api_key=${process.env.TMDB_API_KEY}&append_to_response=videos,keywords`
	);
	const movieDetail = await response.json();
	if (response.ok) {
		//If we can fetch the details, then fetch where it it available to stream
		const resAvailability = await fetch(
			`https://api.themoviedb.org/3/movie/${params.id}/watch/providers?api_key=${process.env.TMDB_API_KEY}`
		);
		const movieAvailability = await resAvailability.json();
		if (resAvailability.ok) {
			// find the amount of likes a movie has
			const movieResult = await database.movie.findFirst({
				where:{
					id:movieId
				},
				include: {
					likes:true
				}
			})
			// if movie exists / doesnt exist
			if(movieResult) {
				likes=movieResult.likes.length
			} else {
				console.log("No likes")
			}
			console.log(locals)
			// if a user is logged in - check if he has liked / saved the movie
			if (locals.user) {
				const userId = locals.user.id
				const result = await database.user.findUnique({
					// check if the user has the requested movie in his favourites
					// if true then change data.props.favourited so we can dynamically change content
					where:{
						id:userId
					},
					select:{
						favorite_movies:{
							where:{
								id:movieId
							}
						},
						liked_movies:{
							where:{
								id:movieId
							}
						}
					}
				})
				console.log(result)
				if(result){
					favorited=result.favorite_movies.length>0
					liked=result.liked_movies.length>0
				}
			}

			/*console.log({
				props: {
					favorited,
					liked,
					likes,
					movieDetail,
					movieAvailability
				},
			})*/
			return {
				props: {
					favorited,
					liked,
					likes,
					movieDetail,
					movieAvailability
				},
			};
		};	
	}
	throw error(404,"not found")
}

//Store movie as favourite
export const actions: Actions = {
	saveMovie: async ({ locals, params }) => {
		if (locals.user.id) {
			const movieId = Number(params.id)
			const userId = locals.user.id
			console.log('Movie ID:  '+ movieId)
			console.log('User:  ' + userId)
			try {
				await database.user.update({
					// Go to currently logged in user
					where:{
						id:userId
					},
					data:{
						favorite_movies:{
							// if movie does not exist - create it and connect it to model user in the field favourite_movies
							connectOrCreate:{
								where:{
									id:movieId
								},
								create:{
									id:movieId,
								}
							}
						}
					}
				})
			}
			catch (e) {
				console.log(e)
				return fail(400, {error: "saving the movie failed"})
			}
		} else {
			throw error(400, "No user id found.")
		}
	},

	// Remove movie from favourites
	unsaveMovie: async ({ locals, params }) => {
		if (locals.user.id) {
			const movieId = Number(params.id)
			const userId = locals.user.id
			console.log('Movie ID:  '+ movieId)
			console.log('User:  ' + userId)
			try {
				await database.movie.update({
					where:{
						id:movieId
					},
					data:{
						favorited_by:{
							disconnect:{
								id:userId
							}
						}
					}
				})
			}
			catch (e) {
				console.log(e)
				return fail(400, {error: "saving the movie failed"})
			}
		} else {
			throw error(400, "No user id found.")
		}
	},

	// add movie to liked movies of given user
	likeMovie: async ({ locals, params }) => {
		console.log("LIKING MOVIE")
		if(locals.user.id) {
			const movieId = Number(params.id)
			const userId = locals.user.id
			console.log('Movie ID:  '+ movieId)
			console.log('User:  ' + userId)
			try {
				const response = await database.user.update({
					// Go to currently logged in user
					where:{
						id:userId
					},
					data:{
						liked_movies:{
							// if movie does not exist - create it and connect it to model user in the field liked_movies
							connectOrCreate:{
								where:{
									id:movieId
								},
								create:{
									id:movieId
								}
							}
						}
					}
				})
			}
			catch (e) {
				console.log(e)
				return fail(400, {error: "liking the movie failed"})
			}
		} else {
			throw error(400, "no user id found")
		}
	},

	// remove user from liked of given movie
	unlikeMovie: async ({ locals, params }) => {
		if (locals.user.id) {
			const movieId = Number(params.id)
			const userId = locals.user.id
			console.log('Movie ID:  '+ movieId)
			console.log('User:  ' + userId)
			try {
				await database.movie.update({
					where:{
						id:movieId
					},
					data:{
						likes:{
							disconnect:{
								id:userId
							}
						}
					}
				})
			}
			catch (e) {
				console.log(e)
				return fail(400, {error: "liking the movie failed"})
			}
		} else {
			throw error(400, "no user id found")
		}
	},
}
