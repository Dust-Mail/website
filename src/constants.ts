export const githubPersonalAccessToken = (): string => {
	const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

	if (token === undefined) {
		throw new Error("GITHUB_PERSONAL_ACCESS_TOKEN is not set");
	}

	return token;
};
