import { AbstractRSSCollector } from "./abstract/abstract-rss-collector";
import { z } from "zod";
import * as cheerio from "cheerio";

/**
 * TODO: Write a description for this collector
 */
export class PubMedCollector extends AbstractRSSCollector<PubMedCollectedData> {
  readonly identifier = "pubmed";
  feedSchema = z.object({
    rss: z.object({
      channel: z.object({
        title: z.string(),
        link: z.string(),
        description: z.string(),
        pubDate: z.string(),
        lastBuildDate: z.string().optional(),
        language: z.string().optional(),
        item: z
          .any()
          .transform((data) => (Array.isArray(data) ? data : [data]))
          .pipe(
            z.array(
              z.object({
                title: z.string(),
                link: z.string(),
                description: z.string(),
                guid: z.string(),
                pubDate: z.string(),
                "content:encoded": z.string(),
              })
            )
          ),
      }),
    }),
  });

  async collect(url: string) {
    const feed = await this.parseFeedXML(await this.fetchFeed(url));
    const parsed = [];
    const tags = new Set<string>();

    tags.add("pubmed");

    for (const article of feed.rss.channel.item) {
      const $ = cheerio.load(article["content:encoded"]);
      const elements = $("p");
      const texts: string[] = [];
      const paragraphs: Record<string, string> = {};

      elements.each((i, el) => {
        // First paragraph only includes string
        // version of some metadata which is redundant
        if (i === 0) return;

        const text = $(el).text().trim();

        // Those paragraphs don't include any
        // useful information so skip them
        if (
          text === "" ||
          text === "ABSTRACT" ||
          text.startsWith("PMID:") ||
          text.startsWith("DOI:")
        ) {
          return;
        }
        texts.push(text);
      });

      // If we can parse a title from the first item that means
      // this abstract text is structured into paragraphs so we can use it
      if (this.parseParagraphTitle(texts[0])) {
        tags.add(feed.rss.channel.title);
        for (const text of texts) {
          const match = this.parseParagraphTitle(text);
          if (match) {
            paragraphs[match[1].trim()] = match[2].trim();
          }
        }

        // Save it
        parsed.push({
          pmid: article.guid,
          title: article.title,
          paragraphs,
          tags: Array.from(tags),
        });
      }
    }

    return parsed;
  }

  /**
   * Parses the title of a paragraph which
   * is in the format of "TITLE:"
   */
  private parseParagraphTitle(text: string) {
    const paragraphRegex = /^([A-Z|\s]+):\s*(.*)/;
    const match = text.match(paragraphRegex);
    return match;
  }
}

export type PubMedCollectedData = {
  pmid: string;
  title: string;
  paragraphs: Record<string, string>;
  tags: string[];
}[];
