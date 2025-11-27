import { AbstractRSSCollector } from "./abstract/abstract-rss-collector";
import { z } from "zod";
import * as cheerio from "cheerio";

/**
 * A general-purpose RSS collector that can handle heterogeneous RSS feeds.
 * Intelligently extracts and cleans text content while preserving raw XML data.
 */
export class SimpleGeneralRSSCollector extends AbstractRSSCollector<SimpleGeneralRSSCollectedData> {
  readonly identifier = "simple-general-rss";
  
  feedSchema = z.object({
    // Handle both RSS and RDF formats
    rss: z.object({
      channel: z.object({
        title: z.string().optional(),
        link: z.string().optional(),
        description: z.string().optional(),
        pubDate: z.string().optional(),
        lastBuildDate: z.string().optional(),
        language: z.string().optional(),
        item: z
          .any()
          .transform((data) => (Array.isArray(data) ? data : [data]))
          .pipe(
            z.array(
              z.object({
                title: z.string(),
                link: z.string().optional(),
                description: z.string().optional(),
                guid: z.union([z.string(), z.object({}).passthrough()]).optional(),
                pubDate: z.string().optional(),
                "content:encoded": z.string().optional(),
                // Handle various RSS namespaces and extensions
                "dc:creator": z.union([z.string(), z.array(z.string())]).optional(),
                "dc:date": z.string().optional(),
                "dc:title": z.string().optional(),
                "dc:subject": z.string().optional(),
                "dc:publisher": z.string().optional(),
                "dc:identifier": z.union([z.string(), z.array(z.string())]).optional(),
                "dc:rights": z.string().optional(),
                "dc:source": z.string().optional(),
                "prism:publicationDate": z.string().optional(),
                "prism:section": z.string().optional(),
                "prism:volume": z.string().optional(),
                "prism:number": z.string().optional(),
                "prism:startingPage": z.string().optional(),
                "prism:endingPage": z.string().optional(),
                "arxiv:announce_type": z.string().optional(),
                category: z.union([z.string(), z.array(z.string())]).optional(),
              })
            )
          ),
      }),
    }).optional(),
    // Handle RDF format (like medRxiv)
    rdf: z.object({
      channel: z.object({
        title: z.string().optional(),
        link: z.string().optional(),
        description: z.string().optional(),
        items: z.object({
          "rdf:Seq": z.object({
            "rdf:li": z.any().optional(),
          }).optional(),
        }).optional(),
        item: z
          .any()
          .transform((data) => (Array.isArray(data) ? data : [data]))
          .pipe(
            z.array(
              z.object({
                title: z.string(),
                link: z.string().optional(),
                description: z.string().optional(),
                "dc:creator": z.union([z.string(), z.array(z.string())]).optional(),
                "dc:date": z.string().optional(),
                "dc:title": z.string().optional(),
                "dc:subject": z.string().optional(),
                "dc:publisher": z.string().optional(),
                "dc:identifier": z.union([z.string(), z.array(z.string())]).optional(),
                "dc:rights": z.string().optional(),
                "dc:source": z.string().optional(),
                "prism:publicationDate": z.string().optional(),
                "prism:section": z.string().optional(),
                "prism:volume": z.string().optional(),
                "prism:number": z.string().optional(),
                "prism:startingPage": z.string().optional(),
                "prism:endingPage": z.string().optional(),
                category: z.union([z.string(), z.array(z.string())]).optional(),
              })
            )
          ).optional(),
      }).optional(),
    }).optional(),
    // Handle Atom feeds
    feed: z.object({
      title: z.string().optional(),
      link: z.string().optional(),
      entry: z
        .any()
        .transform((data) => (Array.isArray(data) ? data : [data]))
        .pipe(
          z.array(
            z.object({
              title: z.string(),
              link: z.string().optional(),
              summary: z.string().optional(),
              content: z.string().optional(),
              author: z.string().optional(),
              published: z.string().optional(),
              id: z.string().optional(),
            })
          )
        ),
    }).optional(),
    // Allow any other structure and try to extract items dynamically
  });

  async collect(url: string) {
    const rawXml = await this.fetchFeed(url);
    const feed = await this.parseFeedXML(rawXml);
    const parsed: SimpleGeneralRSSCollectedData = [];
    const tags = new Set<string>();

    // Try to extract items from different possible structures
    let items: any[] = [];
    let channelTitle = "";

    // Check RSS format
    if (feed.rss?.channel?.item) {
      items = feed.rss.channel.item;
      channelTitle = feed.rss.channel.title || "";
    }
    // Check RDF format
    else if (feed.rdf?.channel?.item) {
      items = feed.rdf.channel.item;
      channelTitle = feed.rdf.channel.title || "";
    }
    // Check RDF 1.0 format with items/rdf:Seq structure (like medRxiv)
    else if (feed.rdf?.channel?.items?.["rdf:Seq"]?.["rdf:li"]) {
      // This is RDF 1.0 format where items are just references
      console.log("RDF 1.0 format detected - items are references, not content");
      items = [];
      channelTitle = feed.rdf.channel.title || "";
    }
    // Check Atom format
    else if (feed.feed?.entry) {
      items = feed.feed.entry;
      channelTitle = feed.feed.title || "";
    }
    // Try to find items dynamically in any structure
    else {
      items = this.findItemsDynamically(feed);
      channelTitle = this.findChannelTitle(feed) || "";
    }

    // If no items found with standard methods, try regex fallback
    if (items.length === 0) {
      console.log("No items found with standard parsing, trying regex fallback...");
      items = this.findItemsWithRegex(rawXml);
      
      // Try to find channel title from the raw XML if we still don't have it
      if (!channelTitle) {
        channelTitle = this.findChannelTitleWithRegex(rawXml) || "";
      }
    }

    console.log(`Items found: ${items.length}`);

    // Add feed-level tags if available
    if (channelTitle) {
      tags.add(channelTitle.toLowerCase().replace(/\s+/g, "-"));
    }
    tags.add("rss-feed");

    for (const item of items) {
      // Extract and clean the main text content
      const mainText = this.extractMainText(item);
      
      // Skip items with very short content (likely just metadata)
      if (mainText.length < 200) {
        console.log(`Skipping item with short content (${mainText.length} chars): ${item.title?.substring(0, 50)}...`);
        continue;
      }
      
      // Extract additional metadata
      const metadata = this.extractMetadata(item);
      
      // Create tags from available fields
      const itemTags = this.extractTags(item, tags);

      parsed.push({
        title: item.title,
        link: item.link,
        mainText: mainText, // Already cleaned in extractMainText
        rawXml: item, // Keep the raw XML data for future use
        metadata,
        tags: itemTags,
        pubDate: item.pubDate || item.published,
        guid: this.extractGuidValue(item.guid) || item.id,
      });
    }

    return parsed;
  }

  /**
   * Extracts GUID value from either a string or object
   */
  private extractGuidValue(guid: any): string | undefined {
    if (typeof guid === 'string') {
      return guid;
    }
    if (guid && typeof guid === 'object') {
      // Try common GUID object properties
      if (guid._text) return guid._text;
      if (guid.text) return guid.text;
      if (guid.value) return guid.value;
      if (guid.content) return guid.content;
      if (guid.id) return guid.id;
      // If none of the above, try to stringify the object
      try {
        return JSON.stringify(guid);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Dynamically searches for items in any XML structure
   */
  private findItemsDynamically(feed: any): any[] {
    const items: any[] = [];
    
    // Recursively search for arrays that might contain items
    const searchForItems = (obj: any, path: string[] = []): void => {
      if (Array.isArray(obj)) {
        // Check if this array looks like it contains items
        if (obj.length > 0 && obj[0] && typeof obj[0] === 'object') {
          const firstItem = obj[0];
          if (firstItem.title || firstItem['dc:title'] || firstItem.name || firstItem.link) {
            items.push(...obj);
            return;
          }
        }
      }
      
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          // Look for common item container names
          if (key.toLowerCase().includes('item') || 
              key.toLowerCase().includes('entry') || 
              key.toLowerCase().includes('article') ||
              key.toLowerCase().includes('post')) {
            if (Array.isArray(value)) {
              items.push(...value);
              return;
            }
          }
          searchForItems(value, [...path, key]);
        }
      }
    };
    
    searchForItems(feed);
    return items;
  }

  /**
   * Fallback method using regex to find items when standard parsing fails
   */
  private findItemsWithRegex(xmlString: string): any[] {
    try {
      console.log("Using regex fallback to find items...");
      console.log(`XML length: ${xmlString.length} characters`);
      
      // Look for the first few item tags to understand the structure
      const firstItemMatch = xmlString.match(/<item[^>]*>/i);
      if (firstItemMatch) {
        console.log(`Found first item tag: ${firstItemMatch[0]}`);
      }
      
      // Look for title tags to understand the structure
      const titleMatches = xmlString.match(/<title[^>]*>.*?<\/title>/gi);
      if (titleMatches) {
        console.log(`Found ${titleMatches.length} title tags`);
        console.log(`First few titles: ${titleMatches.slice(0, 3).map(t => t.substring(0, 100))}`);
      }
      
      // Improved regex to find <item> elements with content, handling CDATA
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      const items: any[] = [];
      let match;
      
      while ((match = itemRegex.exec(xmlString)) !== null) {
        const itemXml = match[1];
        
        // Extract title (handle CDATA)
        const titleMatch = itemXml.match(/<title[^>]*>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<\/title>/i) || 
                          itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? this.cleanText(titleMatch[1]) : "";
        
        // Extract description (handle CDATA)
        const descMatch = itemXml.match(/<description[^>]*>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<\/description>/i) || 
                         itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
        const description = descMatch ? this.cleanText(descMatch[1]) : "";
        
        // Extract link
        const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        const link = linkMatch ? this.cleanText(linkMatch[1]) : "";
        
        // Only include items with substantial content
        if (title && description && description.length > 100) {
          items.push({
            title,
            link,
            description,
            rawXml: itemXml
          });
        }
      }
      
      console.log(`Regex fallback found ${items.length} items`);
      return items;
    } catch (error) {
      console.log(`Regex fallback failed: ${error}`);
      return [];
    }
  }

    /**
   * Dynamically searches for channel title in any XML structure
   */
  private findChannelTitle(feed: any): string | undefined {
    const searchForTitle = (obj: any): string | undefined => {
      if (obj && typeof obj === 'object') {
        if (obj.title) return obj.title;
        if (obj.name) return obj.name;

        for (const value of Object.values(obj)) {
          const result = searchForTitle(value);
          if (result) return result;
        }
      }
      return undefined;
    };

    return searchForTitle(feed);
  }

  /**
   * Find channel title using regex
   */
  private findChannelTitleWithRegex(xmlString: string): string | undefined {
    try {
      // Look for channel title
      const titleMatch = xmlString.match(/<channel[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        return this.cleanText(titleMatch[1]);
      }
      
      // Look for feed title (Atom)
      const feedTitleMatch = xmlString.match(/<feed[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
      if (feedTitleMatch) {
        return this.cleanText(feedTitleMatch[1]);
      }
      
      return undefined;
    } catch (error) {
      console.log(`Regex channel title search failed: ${error}`);
      return undefined;
    }
  }

  /**
   * Intelligently extracts the main text content from an RSS item.
   * Finds the element with the most text and appends other text-rich elements.
   * Returns cleaned, combined text content.
   */
  private extractMainText(item: any): string {
    // Define potential text fields in order of preference
    const textFields = [
      "content:encoded",
      "description", 
      "dc:description",
      "summary",
      "excerpt",
      "abstract",
      "content",
      "body"
    ];
    
    // Find the primary text field (the one with the most content)
    let primaryText = "";
    let primaryField = "";
    let maxLength = 0;
    
    for (const field of textFields) {
      if (item[field] && typeof item[field] === "string") {
        const cleanLength = this.cleanText(item[field]).length;
        if (cleanLength > maxLength) {
          maxLength = cleanLength;
          primaryText = item[field];
          primaryField = field;
        }
      }
    }
    
    // If no primary text found, fall back to title
    if (!primaryText) {
      return item.title || "";
    }
    
    // Collect additional text from other fields that might have substantial content
    const additionalTexts: string[] = [];
    
    for (const field of textFields) {
      if (field !== primaryField && item[field] && typeof item[field] === "string") {
        const cleanText = this.cleanText(item[field]);
        // Only include if it has meaningful content (more than just a few words)
        if (cleanText.length > 20 && !this.isDuplicateContent(primaryText, cleanText)) {
          additionalTexts.push(cleanText);
        }
      }
    }
    
    // Also check for other potential text fields that might not be in our standard list
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === "string" && 
          !textFields.includes(key) && 
          !key.startsWith("dc:") && 
          !key.startsWith("prism:") && 
          !key.startsWith("arxiv:") &&
          key !== "title" &&
          key !== "link" &&
          key !== "guid" &&
          key !== "pubDate") {
        
        const cleanText = this.cleanText(value);
        if (cleanText.length > 20 && !this.isDuplicateContent(primaryText, cleanText)) {
          additionalTexts.push(cleanText);
        }
      }
    }
    
    // Combine primary text with additional texts
    let combinedText = primaryText;
    if (additionalTexts.length > 0) {
      combinedText += "\n\n" + additionalTexts.join("\n\n");
    }
    
    // Clean the combined text
    return this.cleanText(combinedText);
  }

  /**
   * Checks if two text contents are substantially similar to avoid duplication
   */
  private isDuplicateContent(primaryText: string, additionalText: string): boolean {
    const primary = primaryText.toLowerCase().trim();
    const additional = additionalText.toLowerCase().trim();
    
    // If one is contained within the other, it's likely duplicate
    if (primary.includes(additional) || additional.includes(primary)) {
      return true;
    }
    
    // If they share a significant portion of words, they might be duplicates
    const primaryWords = primary.split(/\s+/).filter(word => word.length > 3);
    const additionalWords = additional.split(/\s+/).filter(word => word.length > 3);
    
    if (primaryWords.length === 0 || additionalWords.length === 0) {
      return false;
    }
    
    const commonWords = primaryWords.filter(word => additionalWords.includes(word));
    const similarity = commonWords.length / Math.max(primaryWords.length, additionalWords.length);
    
    // If more than 70% of words are common, consider it duplicate
    return similarity > 0.7;
  }

  /**
   * Cleans text of HTML tags, special characters, and formatting.
   * Preserves readable text while removing markup.
   */
  private cleanText(text: string): string {
    if (!text) return "";

    // Load HTML content with cheerio for parsing
    const $ = cheerio.load(text);
    
    // Remove script and style elements
    $("script, style").remove();
    
    // Extract text content
    let cleaned = $.text();
    
    // Clean up whitespace and special characters
    cleaned = cleaned
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/&lt;/g, "<") // Decode HTML entities
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\[CDATA\[/g, "") // Remove CDATA markers
      .replace(/\]\]>/g, "")
      .replace(/\n+/g, " ") // Replace newlines with spaces
      .replace(/\t+/g, " ") // Replace tabs with spaces
      .trim();

    return cleaned;
  }

  /**
   * Extracts structured metadata from RSS item fields.
   */
  private extractMetadata(item: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    // Extract Dublin Core metadata
    if (item["dc:creator"]) metadata.creator = item["dc:creator"];
    if (item["dc:date"]) metadata.date = item["dc:date"];
    if (item["dc:subject"]) metadata.subject = item["dc:subject"];
    if (item["dc:publisher"]) metadata.publisher = item["dc:publisher"];
    if (item["dc:identifier"]) metadata.identifier = item["dc:identifier"];
    if (item["dc:rights"]) metadata.rights = item["dc:rights"];
    if (item["dc:source"]) metadata.source = item["dc:source"];
    
    // Extract PRISM metadata
    if (item["prism:publicationDate"]) metadata.publicationDate = item["prism:publicationDate"];
    if (item["prism:section"]) metadata.section = item["prism:section"];
    if (item["prism:volume"]) metadata.volume = item["prism:volume"];
    if (item["prism:number"]) metadata.number = item["prism:number"];
    if (item["prism:startingPage"]) metadata.startingPage = item["prism:startingPage"];
    if (item["prism:endingPage"]) metadata.endingPage = item["prism:endingPage"];
    
    // Extract arXiv metadata
    if (item["arxiv:announce_type"]) metadata.announceType = item["arxiv:announce_type"];
    
    // Extract categories
    if (item.category) {
      if (Array.isArray(item.category)) {
        metadata.categories = item.category;
      } else {
        metadata.categories = [item.category];
      }
    }

    return metadata;
  }

  /**
   * Extracts tags from the item and combines with feed-level tags.
   */
  private extractTags(item: any, baseTags: Set<string>): string[] {
    const tags = new Set(baseTags);
    
    // Add tags from categories
    if (item.category) {
      if (Array.isArray(item.category)) {
        item.category.forEach((cat: string) => tags.add(cat.toLowerCase().replace(/\s+/g, "-")));
      } else {
        tags.add(item.category.toLowerCase().replace(/\s+/g, "-"));
      }
    }
    
    // Add tags from subject
    if (item["dc:subject"]) {
      tags.add(item["dc:subject"].toLowerCase().replace(/\s+/g, "-"));
    }
    
    // Add tags from section
    if (item["prism:section"]) {
      tags.add(item["prism:section"].toLowerCase().replace(/\s+/g, "-"));
    }
    
    // Add tags from source/publisher
    if (item["dc:source"]) {
      tags.add(item["dc:source"].toLowerCase().replace(/\s+/g, "-"));
    }
    if (item["dc:publisher"]) {
      tags.add(item["dc:publisher"].toLowerCase().replace(/\s+/g, "-"));
    }

    return Array.from(tags);
  }
}

export type SimpleGeneralRSSCollectedData = {
  title: string;
  link?: string;
  mainText: string;
  rawXml: any; // Raw XML data for future use
  metadata: Record<string, any>;
  tags: string[];
  pubDate?: string;
  guid?: string;
}[];
