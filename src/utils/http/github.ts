import { join } from "path";

import axios from "axios";

import { githubPersonalAccessToken } from "@src/constants";

const githubUrl = new URL("https://github.com");
const githubApiUrl = new URL("https://api.github.com");

export interface Release {
	assets: { name: string; browser_download_url: string }[];
	tag_name: string;
	body: string;
	name: string;
	browser_download_url: string;
}

export interface Sponsor {
	handle: string;
	avatar: string;
	details: { html_url?: string };
}

export interface User {
	username: string;
}

const fetchAuthenticatedUser = async (): Promise<User> => {
	const accessToken = githubPersonalAccessToken();

	const authenticatedUserUrl = new URL("user", githubApiUrl);

	const { data } = await axios.get<{ login: string }>(
		authenticatedUserUrl.toString(),
		{
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		}
	);

	return { username: data.login };
};

const buildSponsorsQuery = (username: string, count = 20) => `
query {
  user(login:"${username}") {
	sponsorshipsAsMaintainer(first: 100) {
		edges {
          node {
            sponsorEntity {
              ... on User {
                login
                name
				avatarUrl
              }
              ... on Organization {
                login
                name
				avatarUrl
              }
            }
            tier {
              monthlyPriceInDollars
            }
          }
        }
    }
  }
}
`;

export const fetchSponsors = async (): Promise<Sponsor[]> => {
	const accessToken = githubPersonalAccessToken();

	const sponsorsUrl = new URL("graphql", githubApiUrl);

	const githubUser = await fetchAuthenticatedUser();

	const sponsorsQuery = buildSponsorsQuery(githubUser.username);

	const { data } = await axios.post<{
		data: {
			user: {
				sponsorshipsAsMaintainer: {
					edges: {
						node: {
							sponsorEntity: {
								login: string;
								name: string;
								avatarUrl: string;
							};
							tier: { monthlyPriceInDollars: number };
						};
					}[];
				};
			};
		};
	}>(
		sponsorsUrl.toString(),
		{
			query: sponsorsQuery
		},
		{
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		}
	);

	const sponsorships: Sponsor[] =
		data.data.user.sponsorshipsAsMaintainer.edges.map((item) => {
			const node = item.node;

			const handle = node.sponsorEntity.login;

			const html_url = new URL(handle, githubUrl).toString();

			return {
				handle,
				avatar: node.sponsorEntity.avatarUrl,
				details: { html_url }
			};
		});

	return sponsorships;
};

export const fetchAllReleases = async (repoOwner: string, repoName: string) => {
	const path = ["repos", repoOwner, repoName, "releases"].join("/");

	const releasesUrl = new URL(path, githubApiUrl);

	const { data } = await axios.get<Release[]>(releasesUrl.toString());

	return data;
};

export const fetchLatestRelease = async (
	repoOwner: string,
	repoName: string
): Promise<Release> => {
	const path = ["repos", repoOwner, repoName, "releases", "latest"].join("/");

	const releaseUrl = new URL(path, githubApiUrl);

	const { data } = await axios.get<Release>(releaseUrl.toString());

	return data;
};
