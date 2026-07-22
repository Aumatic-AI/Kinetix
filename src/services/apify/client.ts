import { env } from "@/config/env";
import { AppError } from "@/utils/app-error";

export interface ApifyScrapeResult {
  runId: string;
  status: string;
  datasetId: string;
}

export class ApifyService {
  private static API_BASE = "https://api.apify.com/v2";

  private static getHeaders() {
    if (!env.APIFY_API_TOKEN) {
      throw new AppError(
        "APIFY_API_TOKEN is not configured",
        "CONFIG_ERROR",
        500
      );
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.APIFY_API_TOKEN}`,
    };
  }

  /**
   * Starts a new actor run
   */
  static async runActor(
    actorId: string,
    input: Record<string, any>
  ): Promise<ApifyScrapeResult> {
    try {
      const response = await fetch(
        `${this.API_BASE}/acts/${actorId}/runs?token=${env.APIFY_API_TOKEN}`,
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(input),
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Apify API error (${response.status}): ${body || response.statusText}`);
      }

      const data = await response.json();
      return {
        runId: data.data.id,
        status: data.data.status,
        datasetId: data.data.defaultDatasetId,
      };
    } catch (error) {
      console.error("Failed to run Apify actor:", error);
      throw new AppError(
        `Failed to trigger Apify scraper: ${error instanceof Error ? error.message : String(error)}`,
        "APIFY_ERROR",
        500
      );
    }
  }

  /**
   * Fetches results from a dataset
   */
  static async getDatasetItems(datasetId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.API_BASE}/datasets/${datasetId}/items?token=${env.APIFY_API_TOKEN}`
      );

      if (!response.ok) {
        throw new Error(`Apify API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch Apify dataset items:", error);
      throw new AppError(
        "Failed to fetch Apify dataset items",
        "APIFY_ERROR",
        500
      );
    }
  }

  /**
   * Checks the status of a run
   */
  static async getRunStatus(runId: string) {
    try {
      const response = await fetch(
        `${this.API_BASE}/actor-runs/${runId}?token=${env.APIFY_API_TOKEN}`
      );
      if (!response.ok) throw new Error("Failed to get status");
      const data = await response.json();
      return data.data.status;
    } catch (error) {
      console.error(error);
      return "FAILED";
    }
  }
}
