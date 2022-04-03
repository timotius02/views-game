const { PrismaClient, PLAYLIST_TYPE } = require("@prisma/client");
const { google } = require("googleapis");
const { nanoid } = require("nanoid");
const prisma = new PrismaClient();

require("dotenv").config();

const service = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

async function getChannel(name) {
  const searchResult = await service.search.list({
    part: ["snippet"],
    q: name,
    maxResults: 1,
  });

  const channelId = searchResult.data.items[0].snippet.channelId;
  const channelTitle = searchResult.data.items[0].snippet.channelTitle;
  const playlistId = `UU${channelId.substring(2)}`;

  const videosResults = await service.playlistItems.list({
    part: ["snippet"],
    playlistId,
    maxResults: 50,
  });

  const videoIds = videosResults.data.items
    .map((item) => item.snippet.resourceId.videoId)
    .join(",");

  const videos = await service.videos.list({
    part: ["snippet", "contentDetails", "statistics"],
    id: videoIds,
  });

  let playlistThumbnails = searchResult.data.items[0].snippet.thumbnails;
  const playlist = await prisma.playlist.create({
    data: {
      id: nanoid(),
      name: channelTitle,
      youtubeId: playlistId,
      createdAt: new Date(),
      thumbnail: playlistThumbnails.standard
        ? playlistThumbnails.standard.url
        : playlistThumbnails.high.url,
      type: PLAYLIST_TYPE.CHANNEL,
    },
  });
  const videosPromises = [];

  for (let item of videos.data.items) {
    const thumbnails = item.snippet.thumbnails;

    videosPromises.push(
      prisma.video.create({
        data: {
          id: item.id,
          title: item.snippet.title,
          viewCount: item.statistics.viewCount,
          thumbnail: thumbnails.standard
            ? thumbnails.standard.url
            : thumbnails.high.url,
          playlistId: playlist.id,
        },
      })
    );
  }
  await Promise.all(videosPromises);
}

async function main() {
  const channels = [
    "LilyPichu",
    "Michael Reeves",
    "Linus Tech Tips",
    "Valkyrae",
    "OfflineTV",
  ];
  let channelPromises = [];
  for (let channel of channels) {
    channelPromises.push(getChannel(channel));
  }

  await Promise.all(channelPromises);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
