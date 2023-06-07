import { GetStaticProps, NextPage } from "next";
import { fetchAllReleases, fetchLatestRelease } from "utils/http/github";

import { FC, useEffect, useState } from "react";

import axios from "axios";

import Version, { Asset } from "@interfaces/version";

import Footer from "@components/Footer";
import Header from "@components/Header";
import Layout from "@components/Layout";

type Platform = "windows" | "osx" | "linux" | "unknown";

const OSX: FC<{ dmg?: string }> = ({ dmg }) => {
	return (
		<>
			<a href={dmg}>
				<button>Executable</button>
			</a>
		</>
	);
};

const Windows: FC<{ msi?: string }> = ({ msi }) => {
	return (
		<>
			<a href={msi}>
				<button>Installer</button>
			</a>
		</>
	);
};

const Linux: FC<{ deb?: string; appImage?: string }> = ({ deb, appImage }) => {
	return (
		<>
			<h4>Executeables</h4>
			<a href={appImage}>
				<button>AppImage</button>
			</a>
			<br />
			<a href={deb}>
				<button>Debian software package</button>
			</a>
			<h4>Arch linux</h4>
			<pre>
				<code>yay -S dust-mail</code>
			</pre>
			Client only:
			<pre>
				<code>yay -S dust-mail-client</code>
			</pre>
			Server only:
			<pre>
				<code>yay -S dust-mail-server</code>
			</pre>
		</>
	);
};

const Download: NextPage<{ versions: Version[] }> = ({ versions }) => {
	const [platform, setPlatform] = useState<Platform>("unknown");

	const platformNames: Record<Platform, string> = {
		windows: "Windows",
		linux: "Linux",
		osx: "MacOS",
		unknown: "Unknown operating system"
	};

	const findAssets = (
		version?: Version
	): { deb?: Asset; appImage?: Asset; msi?: Asset; dmg?: Asset } => {
		const debFile = version?.assets.find((asset) =>
			asset.name.endsWith(".deb")
		);

		const appImageFile = version?.assets.find((asset) =>
			asset.name.endsWith(".AppImage")
		);

		const msiFile = version?.assets.find((asset) =>
			asset.name.endsWith(".msi")
		);

		const dmgFile = version?.assets.find((asset) =>
			asset.name.endsWith(".dmg")
		);

		return {
			deb: debFile,
			appImage: appImageFile,
			msi: msiFile,
			dmg: dmgFile
		};
	};

	useEffect(() => {
		const platformString = window.navigator.platform.toLowerCase();

		if (platformString.match(/windows/)) {
			setPlatform("windows");
		} else if (platformString.match(/linux/)) {
			setPlatform("linux");
		} else if (platformString.match(/mac/)) {
			setPlatform("osx");
		}
	}, []);

	const latestVersion = versions.find((version) => version.latest);

	const { deb, appImage, dmg, msi } = findAssets(latestVersion);

	return (
		<Layout title="Download">
			<Header
				title="Downloads"
				description="Download the newest version or browse the older versions"
			/>
			<main>
				{platform != "unknown" && (
					<>
						<h1>Download latest version for {platformNames[platform]}</h1>
						{latestVersion?.description && <p>{latestVersion.description}</p>}
					</>
				)}
				{platform == "linux" && (
					<Linux deb={deb?.url} appImage={appImage?.url} />
				)}
				{platform == "windows" && <Windows msi={msi?.url} />}
				{platform == "osx" && <OSX dmg={dmg?.url} />}
				{platform != "unknown" && (
					<>
						<h2>Downloads for other operating systems</h2>
						<p>
							Incorrectly guessed the operating system or just want the
							download? You can find them below
						</p>
					</>
				)}

				{platform == "unknown" && <h1>Downloads</h1>}

				{platform != "windows" && (
					<>
						<h3>Windows</h3>
						<Windows msi={msi?.url} />
					</>
				)}

				{platform != "linux" && (
					<>
						<h3>Linux</h3>
						<Linux deb={deb?.url} appImage={appImage?.url} />
					</>
				)}

				{platform != "osx" && (
					<>
						<h3>MacOS</h3>
						<OSX dmg={dmg?.url} />
					</>
				)}

				<h2>Older versions</h2>

				<table>
					<thead>
						<tr>
							<th>Version</th>
							<th>Windows installer</th>
							<th>MacOS executable</th>
							<th>AppImage</th>
							<th>Debian software package</th>
						</tr>
					</thead>
					<tbody>
						{versions
							.filter(
								(version) => version.assets.length >= 5 && !version.latest
							)
							.map((version) => {
								const assets = findAssets(version);

								return (
									<tr key={version.tag}>
										<td>{version.tag}</td>
										<td>
											<a href={assets.msi?.url}>{assets.msi?.name}</a>
										</td>
										<td>
											<a href={assets.dmg?.url}>{assets.dmg?.name}</a>
										</td>
										<td>
											<a href={assets.appImage?.url}>{assets.appImage?.name}</a>
										</td>
										<td>
											<a href={assets.deb?.url}>{assets.deb?.name}</a>
										</td>
									</tr>
								);
							})}
					</tbody>
				</table>
			</main>

			<Footer />
		</Layout>
	);
};

export const getStaticProps: GetStaticProps = async () => {
	const githubUsername = process.env.NEXT_PUBLIC_GITHUB_USERNAME;
	const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO;

	if (githubRepo === undefined || githubUsername === undefined)
		return { notFound: true };

	const releases = await fetchAllReleases(githubUsername, githubRepo);

	const latestRelease = await fetchLatestRelease(githubUsername, githubRepo);

	const versions: Version[] = releases
		.filter((release) => release.assets.length >= 5)
		.map((release) => ({
			assets: release.assets.map(({ browser_download_url, name }) => ({
				url: browser_download_url,
				name
			})),
			description: release.body != "" ? release.body : null,
			latest: latestRelease.tag_name == release.tag_name,
			tag: release.tag_name
		}));

	return { props: { versions }, revalidate: 5 * 60 };
};

export default Download;
