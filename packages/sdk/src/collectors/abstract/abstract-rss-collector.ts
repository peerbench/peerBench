import { XMLParser } from "fast-xml-parser";
import { AbstractCollector } from "./abstract-collector";
import { z } from "zod";

export abstract class AbstractRSSCollector<
  TOutput,
> extends AbstractCollector<TOutput> {
  protected parser: XMLParser;
  abstract feedSchema: z.ZodSchema<unknown>;

  constructor() {
    super();
    this.parser = new XMLParser({});
  }

  /**
   * Helper function to fetch the feed from the URL
   * @param url The URL of the feed
   * @returns Raw XML string of the feed
   */
  protected async fetchFeed(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.text();
  }

  /**
   * Parses the raw XML string and validates it
   * against the defined `FeedStructure` schema
   * @param xml The raw XML string
   * @returns Structured data of the RSS feed
   */
  protected async parseFeedXML(
    xml: string
  ): Promise<z.infer<(typeof this)["feedSchema"]>> {
    const parsedData = this.parser.parse(xml);
    return await this.feedSchema.parseAsync(parsedData);
  }
}
